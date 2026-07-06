import hashlib
import html
import json
import os
import re
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from typing import Any
from urllib.parse import parse_qs, quote_plus, unquote, urljoin, urlparse
from urllib.request import Request, urlopen


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.lower())
    normalized = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    return normalized.replace("đ", "d")


def compact_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() not in {"0", "false", "no", "off"}


@dataclass(frozen=True)
class SearchResult:
    title: str
    url: str
    snippet: str = ""
    provider: str = "duckduckgo"


class HtmlTextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._skip_depth = 0
        self._title_depth = 0
        self.parts: list[str] = []
        self.title_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style", "noscript", "svg"}:
            self._skip_depth += 1
        if tag == "title":
            self._title_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "noscript", "svg"} and self._skip_depth:
            self._skip_depth -= 1
        if tag == "title" and self._title_depth:
            self._title_depth -= 1

    def handle_data(self, data: str) -> None:
        text = compact_whitespace(html.unescape(data))
        if not text:
            return
        if self._title_depth:
            self.title_parts.append(text)
        if not self._skip_depth:
            self.parts.append(text)

    @property
    def title(self) -> str:
        return compact_whitespace(" ".join(self.title_parts))[:180]

    @property
    def text(self) -> str:
        return compact_whitespace(" ".join(self.parts))


class DuckDuckGoResultParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.results: list[SearchResult] = []
        self._active_href: str | None = None
        self._active_title: list[str] = []
        self._active_snippet: list[str] | None = None
        self._last_result_index: int | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_map = {name: value or "" for name, value in attrs}
        classes = attrs_map.get("class", "")
        if tag == "a" and "result__a" in classes:
            self._active_href = attrs_map.get("href")
            self._active_title = []
            return
        if tag in {"a", "div"} and "result__snippet" in classes:
            self._active_snippet = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._active_href:
            title = compact_whitespace(" ".join(self._active_title))
            url = self._clean_duckduckgo_url(self._active_href)
            if title and url:
                self.results.append(SearchResult(title=title, url=url))
                self._last_result_index = len(self.results) - 1
            self._active_href = None
            self._active_title = []
            return
        if self._active_snippet is not None and tag in {"a", "div"}:
            snippet = compact_whitespace(" ".join(self._active_snippet))
            if snippet and self._last_result_index is not None:
                result = self.results[self._last_result_index]
                self.results[self._last_result_index] = SearchResult(
                    title=result.title,
                    url=result.url,
                    snippet=snippet,
                    provider=result.provider,
                )
            self._active_snippet = None

    def handle_data(self, data: str) -> None:
        if self._active_href:
            self._active_title.append(html.unescape(data))
        if self._active_snippet is not None:
            self._active_snippet.append(html.unescape(data))

    def _clean_duckduckgo_url(self, href: str) -> str:
        value = html.unescape(href)
        if value.startswith("//"):
            value = "https:" + value
        parsed = urlparse(value)
        if parsed.path.startswith("/l/"):
            target = parse_qs(parsed.query).get("uddg", [""])[0]
            return unquote(target)
        return value


class UniversityWebRetriever:
    """Searches and fetches web pages to provide source-backed evidence.

    This class intentionally does not know the local university catalog. It only
    uses the search context produced by UniversityLookupTool and live web pages.
    """

    def __init__(
        self,
        *,
        timeout_seconds: float | None = None,
        max_queries: int | None = None,
        max_pages: int | None = None,
        cache_ttl_seconds: int | None = None,
    ) -> None:
        self.timeout_seconds = timeout_seconds or float(os.getenv("UNIVERSITY_CRAWL_TIMEOUT_SECONDS", "4"))
        self.max_queries = max_queries or int(os.getenv("UNIVERSITY_CRAWL_MAX_QUERIES", "3"))
        self.max_pages = max_pages or int(os.getenv("UNIVERSITY_CRAWL_MAX_PAGES", "6"))
        self.cache_ttl_seconds = cache_ttl_seconds or int(os.getenv("UNIVERSITY_CRAWL_CACHE_TTL_SECONDS", "900"))
        self.user_agent = os.getenv(
            "UNIVERSITY_CRAWL_USER_AGENT",
            "Mozilla/5.0 (compatible; CareerCopilotUniversityBot/1.0; +https://example.local)",
        )
        self._cache: dict[str, tuple[float, dict[str, Any]]] = {}

    def retrieve(self, search_context: dict[str, Any]) -> dict[str, Any]:
        cache_key = self._cache_key(search_context)
        cached = self._cache.get(cache_key)
        if cached and time.monotonic() - cached[0] <= self.cache_ttl_seconds:
            result = dict(cached[1])
            result["cacheHit"] = True
            return result

        queries = self._select_queries(search_context)
        warnings: list[str] = []
        search_results: list[SearchResult] = []

        for query in queries:
            try:
                search_results.extend(self.search(query))
            except Exception as exc:
                warnings.append(f"Search failed for query '{query}': {exc}")

        deduped_results = self._dedupe_results(search_results)[: self.max_pages]
        evidence = self._fetch_evidence_parallel(deduped_results, search_context, warnings)
        verified_evidence = self._verified_evidence(evidence, search_context)

        result = {
            "retrievedAt": datetime.now(timezone.utc).isoformat(),
            "cacheHit": False,
            "queriesUsed": queries,
            "resultCount": len(deduped_results),
            "evidenceCount": len(evidence),
            "verifiedEvidenceCount": len(verified_evidence),
            "sources": self._sources_from_evidence(verified_evidence or evidence),
            "evidence": evidence,
            "verifiedEvidence": verified_evidence,
            "warnings": warnings[:8],
            "policy": {
                "webFirst": True,
                "catalogUsed": False,
                "requiresCitationForExactNumbers": True,
                "officialSourcePreference": "Prefer .edu.vn/.gov.vn and official admissions pages; mark other sources as reference.",
            },
        }
        self._cache[cache_key] = (time.monotonic(), result)
        return result

    def search(self, query: str) -> list[SearchResult]:
        url = f"https://duckduckgo.com/html/?q={quote_plus(query)}"
        body = self._request_text(url)
        parser = DuckDuckGoResultParser()
        parser.feed(body)
        results = [
            result for result in parser.results if not self._is_search_engine_url(result.url)
        ]
        if results:
            return results[:10]

        fallback_results = [
            result for result in self._fallback_search_links(body, url) if not self._is_search_engine_url(result.url)
        ]
        if fallback_results:
            return fallback_results[:10]
        bing_results = self._search_bing(query)
        if bing_results:
            return bing_results
        return self._search_yahoo(query)

    def _search_bing(self, query: str) -> list[SearchResult]:
        url = f"https://www.bing.com/search?q={quote_plus(query)}"
        body = self._request_text(url)
        results: list[SearchResult] = []
        for block in re.findall(r'<li[^>]+class=["\'][^"\']*\bb_algo\b[^"\']*["\'][^>]*>(.*?)</li>', body, flags=re.I | re.S):
            match = re.search(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', block, flags=re.I | re.S)
            if not match:
                continue
            target_url = html.unescape(match.group(1))
            if self._is_search_engine_url(target_url):
                continue
            title = compact_whitespace(re.sub(r"<[^>]+>", " ", html.unescape(match.group(2))))
            snippet_match = re.search(r"<p[^>]*>(.*?)</p>", block, flags=re.I | re.S)
            snippet = ""
            if snippet_match:
                snippet = compact_whitespace(re.sub(r"<[^>]+>", " ", html.unescape(snippet_match.group(1))))
            if title and target_url:
                results.append(SearchResult(title=title, url=target_url, snippet=snippet, provider="bing"))
            if len(results) >= 10:
                break
        if results:
            return results
        return [
            SearchResult(title=item.title, url=item.url, snippet=item.snippet, provider="bing")
            for item in self._fallback_search_links(body, url)
            if not self._is_search_engine_url(item.url)
        ][:10]

    def _search_yahoo(self, query: str) -> list[SearchResult]:
        url = f"https://search.yahoo.com/search?p={quote_plus(query)}"
        body = self._request_text(url)
        results: list[SearchResult] = []
        blocks = re.findall(
            r'<li[^>]*>\s*(<div[^>]+class=["\'][^"\']*\bdd\b[^"\']*\balgo\b[^"\']*["\'][\s\S]*?</li>)',
            body,
            flags=re.I | re.S,
        )
        for block in blocks:
            link_match = re.search(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', block, flags=re.I | re.S)
            if not link_match:
                continue
            target_url = self._clean_yahoo_url(html.unescape(link_match.group(1)))
            if self._is_search_engine_url(target_url):
                continue
            title_match = re.search(r"<h3[^>]*>(.*?)</h3>", block, flags=re.I | re.S)
            title_html = title_match.group(1) if title_match else link_match.group(2)
            title = compact_whitespace(re.sub(r"<[^>]+>", " ", html.unescape(title_html)))
            snippet_match = re.search(r'<div[^>]+class=["\'][^"\']*\bcompText\b[^"\']*["\'][^>]*>(.*?)</div>', block, flags=re.I | re.S)
            snippet = ""
            if snippet_match:
                snippet = compact_whitespace(re.sub(r"<[^>]+>", " ", html.unescape(snippet_match.group(1))))
            if title and target_url:
                results.append(SearchResult(title=title, url=target_url, snippet=snippet, provider="yahoo"))
            if len(results) >= 10:
                break
        return results

    def fetch_page_evidence(
        self,
        result: SearchResult,
        search_context: dict[str, Any],
    ) -> dict[str, Any] | None:
        parsed = urlparse(result.url)
        if not parsed.scheme.startswith("http") or not parsed.netloc:
            return None
        if self._looks_like_binary_url(result.url):
            return self._binary_url_evidence(result, search_context)

        body = self._request_text(result.url)
        extractor = HtmlTextExtractor()
        extractor.feed(body[:600_000])
        page_text = extractor.text[:120_000]
        if not page_text:
            return None

        return self._build_page_evidence(
            result=result,
            page_title=extractor.title or result.title,
            page_text=page_text,
            search_context=search_context,
        )

    def _request_text(self, url: str) -> str:
        request = Request(url, headers={"User-Agent": self.user_agent})
        with urlopen(request, timeout=self.timeout_seconds) as response:
            content_type = response.headers.get("content-type", "")
            charset = response.headers.get_content_charset() or "utf-8"
            data = response.read(750_000)
        if "pdf" in content_type.lower():
            return ""
        return data.decode(charset, errors="replace")

    def _select_queries(self, search_context: dict[str, Any]) -> list[str]:
        queries: list[str] = []
        official_queries = search_context.get("suggestedOfficialSearchQueries") or []
        generic_queries = search_context.get("genericSearchQueries") or []
        current_question = search_context.get("currentQuestion")

        for query in [*official_queries, *generic_queries]:
            if isinstance(query, str) and query.strip():
                queries.append(query.strip())

        if current_question:
            freshness = search_context.get("freshnessRequirement") or {}
            years = freshness.get("preferredAdmissionScoreYears") or []
            suffix = " ".join(str(year) for year in years[:2])
            queries.append(f"{current_question} tuyen sinh diem chuan hoc phi {suffix}".strip())

        return self._dedupe_queries(queries)[: self.max_queries]

    def _dedupe_queries(self, queries: list[str]) -> list[str]:
        seen: set[str] = set()
        deduped: list[str] = []
        for query in queries:
            normalized = compact_whitespace(query)
            key = normalize_text(normalized)
            if not key or key in seen:
                continue
            seen.add(key)
            deduped.append(normalized)
        return deduped

    def _dedupe_results(self, results: list[SearchResult]) -> list[SearchResult]:
        seen: set[str] = set()
        deduped: list[SearchResult] = []
        for result in results:
            normalized_url = self._canonical_url(result.url)
            if not normalized_url or normalized_url in seen:
                continue
            seen.add(normalized_url)
            deduped.append(result)
        return deduped

    def _fetch_evidence_parallel(
        self,
        results: list[SearchResult],
        search_context: dict[str, Any],
        warnings: list[str],
    ) -> list[dict[str, Any]]:
        evidence: list[dict[str, Any]] = []
        if not results:
            return evidence

        with ThreadPoolExecutor(max_workers=min(4, max(1, len(results)))) as executor:
            futures = {
                executor.submit(self.fetch_page_evidence, result, search_context): result
                for result in results
            }
            for future in as_completed(futures):
                result = futures[future]
                try:
                    item = future.result()
                except Exception as exc:
                    warnings.append(f"Fetch failed for {result.url}: {exc}")
                    continue
                if item and self._is_relevant_evidence(item, search_context):
                    evidence.append(item)

        evidence.sort(
            key=lambda item: (
                not item.get("isOfficial"),
                -len(item.get("scoreCandidates") or []),
                item.get("title") or "",
            )
        )
        return evidence

    def _build_page_evidence(
        self,
        *,
        result: SearchResult,
        page_title: str,
        page_text: str,
        search_context: dict[str, Any],
    ) -> dict[str, Any]:
        url = result.url
        domain = urlparse(url).netloc.lower().removeprefix("www.")
        target_terms = self._target_terms(search_context)
        year_terms = [str(year) for year in self._target_years(search_context)]
        snippets = self._select_snippets(page_text, [*target_terms, *year_terms])
        snippet_text = " ".join(snippets) or page_text[:6000]
        normalized_snippet = normalize_text(snippet_text)

        matched_terms = [
            term for term in target_terms if normalize_text(term) and normalize_text(term) in normalized_snippet
        ][:8]
        score_candidates = self._extract_score_candidates(snippet_text, search_context)
        tuition_candidates = self._extract_tuition_candidates(snippet_text)
        official_domains = self._official_domains(search_context)

        return {
            "title": page_title or result.title,
            "url": url,
            "domain": domain,
            "isOfficial": self._is_official_domain(domain, official_domains),
            "searchProvider": result.provider,
            "searchSnippet": result.snippet,
            "matchedTargetTerms": matched_terms,
            "yearsMentioned": [year for year in year_terms if year in snippet_text],
            "scoreCandidates": score_candidates[:8],
            "tuitionCandidates": tuition_candidates[:5],
            "scoreFilterSatisfied": self._score_filter_satisfied(score_candidates, search_context),
            "snippets": snippets[:5],
        }

    def _binary_url_evidence(
        self,
        result: SearchResult,
        search_context: dict[str, Any],
    ) -> dict[str, Any]:
        domain = urlparse(result.url).netloc.lower().removeprefix("www.")
        official_domains = self._official_domains(search_context)
        return {
            "title": result.title,
            "url": result.url,
            "domain": domain,
            "isOfficial": self._is_official_domain(domain, official_domains),
            "searchProvider": result.provider,
            "searchSnippet": result.snippet,
            "matchedTargetTerms": [],
            "yearsMentioned": [str(year) for year in self._target_years(search_context) if str(year) in result.title + result.snippet],
            "scoreCandidates": [],
            "tuitionCandidates": [],
            "scoreFilterSatisfied": None,
            "snippets": [result.snippet] if result.snippet else [],
            "note": "Binary/PDF source discovered; content extraction was skipped by lightweight crawler.",
        }

    def _select_snippets(self, text: str, terms: list[str]) -> list[str]:
        normalized = normalize_text(text)
        normalized_terms = [normalize_text(term) for term in terms if term]
        priority_terms = [
            "diem chuan",
            "diem trung tuyen",
            "hoc phi",
            "tuyen sinh",
            "xet tuyen",
            *normalized_terms,
        ]

        snippets: list[str] = []
        for term in dict.fromkeys(priority_terms):
            if not term:
                continue
            start = normalized.find(term)
            if start < 0:
                continue
            raw_start = max(0, start - 280)
            raw_end = min(len(text), start + 520)
            snippet = compact_whitespace(text[raw_start:raw_end])
            if snippet and snippet not in snippets:
                snippets.append(snippet)
            if len(snippets) >= 6:
                break

        if not snippets:
            chunks = re.split(r"(?<=[.!?])\s+", text[:4000])
            snippets = [compact_whitespace(chunk) for chunk in chunks if len(chunk) > 80][:3]
        return snippets

    def _extract_score_candidates(
        self,
        text: str,
        search_context: dict[str, Any],
    ) -> list[dict[str, Any]]:
        normalized = normalize_text(text).replace(",", ".")
        years = set(str(year) for year in self._target_years(search_context))
        candidates: list[dict[str, Any]] = []
        score_pattern = re.compile(r"(?<!\d)([1-2]\d(?:\.\d{1,2})?|30(?:\.0{1,2})?)(?!\d)")
        for match in score_pattern.finditer(normalized):
            value = self._parse_score(match.group(1))
            if value is None:
                continue
            start = max(0, match.start() - 170)
            end = min(len(normalized), match.end() + 170)
            context = normalized[start:end]
            if not any(signal in context for signal in ["diem", "chuan", "trung tuyen", "xet tuyen", "thpt"]):
                continue
            year = next((year for year in years if year in context), None)
            candidates.append(
                {
                    "value": value,
                    "year": int(year) if year else None,
                    "context": compact_whitespace(text[start:end])[:420],
                }
            )
        return self._dedupe_score_candidates(candidates)

    def _extract_tuition_candidates(self, text: str) -> list[dict[str, Any]]:
        normalized = normalize_text(text)
        candidates: list[dict[str, Any]] = []
        for signal in ["hoc phi", "tin chi", "trieu", "dong/nam", "vnd"]:
            start = normalized.find(signal)
            if start < 0:
                continue
            raw_start = max(0, start - 150)
            raw_end = min(len(text), start + 380)
            context = compact_whitespace(text[raw_start:raw_end])
            if context and context not in [item["context"] for item in candidates]:
                candidates.append({"context": context[:520]})
            if len(candidates) >= 5:
                break
        return candidates

    def _verified_evidence(
        self,
        evidence: list[dict[str, Any]],
        search_context: dict[str, Any],
    ) -> list[dict[str, Any]]:
        target_terms = self._target_terms(search_context)
        normalized_target_terms = [normalize_text(term) for term in target_terms]
        has_score_filter = bool(search_context.get("admissionScoreFilter"))
        lookup = search_context.get("lookupUnderstanding") or {}
        asks_score = bool(lookup.get("asksAdmissionScore"))
        verified: list[dict[str, Any]] = []
        for item in evidence:
            program_ok = not target_terms or bool(item.get("matchedTargetTerms"))
            score_context_ok = True
            if (has_score_filter or asks_score) and target_terms:
                score_context_ok = any(
                    self._score_candidate_matches_target(candidate, normalized_target_terms)
                    for candidate in item.get("scoreCandidates") or []
                )
            score_ok = score_context_ok and (not has_score_filter or item.get("scoreFilterSatisfied") is True)
            source_ok = bool(item.get("isOfficial")) or bool(item.get("scoreCandidates")) or bool(item.get("tuitionCandidates"))
            if program_ok and score_ok and source_ok:
                verified.append(item)
        return verified

    def _is_relevant_evidence(self, item: dict[str, Any], search_context: dict[str, Any]) -> bool:
        if item.get("isOfficial"):
            return True
        if item.get("matchedTargetTerms") or item.get("scoreCandidates") or item.get("tuitionCandidates"):
            return True
        target_terms = self._target_terms(search_context)
        searchable = normalize_text(" ".join([item.get("title", ""), item.get("searchSnippet", "")]))
        return any(normalize_text(term) in searchable for term in target_terms)

    def _score_filter_satisfied(
        self,
        score_candidates: list[dict[str, Any]],
        search_context: dict[str, Any],
    ) -> bool | None:
        score_filter = search_context.get("admissionScoreFilter")
        if not score_filter:
            return None
        target_terms = [normalize_text(term) for term in self._target_terms(search_context)]
        return any(
            self._score_matches_filter(item.get("value"), score_filter)
            and self._score_candidate_matches_target(item, target_terms)
            for item in score_candidates
        )

    def _score_candidate_matches_target(
        self,
        score_candidate: dict[str, Any],
        normalized_target_terms: list[str],
    ) -> bool:
        if not normalized_target_terms:
            return True
        context = normalize_text(str(score_candidate.get("context") or ""))
        return any(term and term in context for term in normalized_target_terms)

    def _score_matches_filter(self, value: Any, score_filter: dict[str, Any]) -> bool:
        if not isinstance(value, (int, float)):
            return False
        operator = score_filter.get("operator")
        inclusive = bool(score_filter.get("inclusive", True))
        if operator == "max":
            target = score_filter.get("value")
            if not isinstance(target, (int, float)):
                return False
            return value <= target if inclusive else value < target
        if operator == "min":
            target = score_filter.get("value")
            if not isinstance(target, (int, float)):
                return False
            return value >= target if inclusive else value > target
        if operator == "range":
            lower = score_filter.get("min")
            upper = score_filter.get("max")
            if not isinstance(lower, (int, float)) or not isinstance(upper, (int, float)):
                return False
            return lower <= value <= upper
        return False

    def _target_terms(self, search_context: dict[str, Any]) -> list[str]:
        target_program = search_context.get("targetProgram") or {}
        terms = [
            *(target_program.get("searchTerms") or []),
            *(target_program.get("matchedTerms") or []),
            target_program.get("canonicalName"),
        ]
        return [str(term) for term in terms if term]

    def _target_years(self, search_context: dict[str, Any]) -> list[int]:
        freshness = search_context.get("freshnessRequirement") or {}
        years = freshness.get("preferredAdmissionScoreYears") or []
        if not years:
            years = (search_context.get("lookupUnderstanding") or {}).get("targetAdmissionScoreYears") or []
        return [int(year) for year in years if str(year).isdigit()]

    def _official_domains(self, search_context: dict[str, Any]) -> set[str]:
        domains: set[str] = set()
        for program in search_context.get("candidatePrograms") or []:
            for domain in program.get("officialDomains") or []:
                domains.add(str(domain).lower().removeprefix("www."))
        return domains

    def _is_official_domain(self, domain: str, official_domains: set[str]) -> bool:
        if domain in official_domains or any(domain.endswith("." + item) for item in official_domains):
            return True
        return (
            domain.endswith(".edu.vn")
            or domain.endswith(".gov.vn")
            or domain.endswith(".moet.gov.vn")
            or domain in {"moet.gov.vn", "thisinh.thitotnghiepthpt.edu.vn"}
        )

    def _sources_from_evidence(self, evidence: list[dict[str, Any]]) -> list[dict[str, Any]]:
        sources: list[dict[str, Any]] = []
        seen: set[str] = set()
        for item in evidence:
            url = item.get("url")
            if not url or url in seen:
                continue
            seen.add(url)
            sources.append(
                {
                    "title": item.get("title") or url,
                    "url": url,
                    "domain": item.get("domain"),
                    "isOfficial": bool(item.get("isOfficial")),
                }
            )
        return sources[:8]

    def _fallback_search_links(self, body: str, base_url: str) -> list[SearchResult]:
        results: list[SearchResult] = []
        for href, label in re.findall(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', body, flags=re.I | re.S):
            url = urljoin(base_url, html.unescape(href))
            parsed = urlparse(url)
            if parsed.scheme not in {"http", "https"}:
                continue
            title = compact_whitespace(re.sub(r"<[^>]+>", " ", html.unescape(label)))
            if title:
                results.append(SearchResult(title=title, url=url))
            if len(results) >= 10:
                break
        return results

    def _parse_score(self, raw_value: str) -> float | None:
        try:
            value = float(raw_value)
        except (TypeError, ValueError):
            return None
        if 0 <= value <= 30:
            return value
        return None

    def _dedupe_score_candidates(self, candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
        seen: set[tuple[float, int | None]] = set()
        deduped: list[dict[str, Any]] = []
        for item in candidates:
            key = (float(item["value"]), item.get("year"))
            if key in seen:
                continue
            seen.add(key)
            deduped.append(item)
        return deduped

    def _canonical_url(self, url: str) -> str:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return ""
        path = parsed.path.rstrip("/") or "/"
        return parsed._replace(fragment="", path=path).geturl()

    def _looks_like_binary_url(self, url: str) -> bool:
        return urlparse(url).path.lower().endswith((".pdf", ".doc", ".docx", ".xls", ".xlsx"))

    def _is_search_engine_url(self, url: str) -> bool:
        domain = urlparse(url).netloc.lower()
        return any(
            blocked in domain
            for blocked in ["duckduckgo.com", "bing.com", "microsoft.com", "go.microsoft.com", "yahoo.com"]
        )

    def _clean_yahoo_url(self, url: str) -> str:
        match = re.search(r"/RU=([^/]+)/RK=", url)
        if match:
            return unquote(match.group(1))
        return url

    def _cache_key(self, search_context: dict[str, Any]) -> str:
        payload = json.dumps(
            {
                "currentQuestion": search_context.get("currentQuestion"),
                "queries": self._select_queries(search_context),
                "targetProgram": search_context.get("targetProgram"),
                "admissionScoreFilter": search_context.get("admissionScoreFilter"),
            },
            ensure_ascii=False,
            sort_keys=True,
        )
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class UniversityEvidenceVerifier:
    max_prompt_sources = 4
    max_verified_prompt_evidence = 3
    max_fallback_prompt_evidence = 2
    max_prompt_snippet_chars = 320
    max_prompt_score_context_chars = 220
    max_prompt_tuition_context_chars = 220

    def requires_verified_data(self, search_context: dict[str, Any]) -> bool:
        lookup = search_context.get("lookupUnderstanding") or {}
        return bool(
            search_context.get("admissionScoreFilter")
            or lookup.get("asksAdmissionScore")
            or lookup.get("asksTuition")
        )

    def has_verified_evidence(self, retrieval: dict[str, Any] | None) -> bool:
        if not retrieval:
            return False
        return bool(retrieval.get("verifiedEvidence") or retrieval.get("evidence"))

    def format_no_verified_data(self, search_context: dict[str, Any], retrieval: dict[str, Any] | None = None) -> str:
        question = search_context.get("currentQuestion") or "yeu cau nay"
        queries = (retrieval or {}).get("queriesUsed") or search_context.get("genericSearchQueries") or []
        lines = [
            "Mình chưa tìm được dữ liệu tuyển sinh đủ chắc từ nguồn web đã crawl để trả lời bằng số liệu cụ thể.",
            "",
            f"Câu hỏi: {question}",
            "",
            "Mình sẽ không dùng catalog hard-code hoặc tự suy đoán điểm chuẩn/học phí. Em có thể thử lại với tên trường/ngành cụ thể hơn, hoặc kiểm tra trực tiếp trang tuyển sinh chính thức của trường.",
        ]
        if queries:
            lines.extend(["", "**Truy vấn đã thử:**"])
            for query in queries[:4]:
                lines.append(f"- {query}")
        return "\n".join(lines)

    def enrich_prompt_input(
        self,
        search_context: dict[str, Any],
        retrieval: dict[str, Any] | None,
    ) -> dict[str, Any]:
        enriched = self._compact_search_context(search_context)
        if retrieval:
            verified = retrieval.get("verifiedEvidence") or []
            fallback_evidence = [] if verified else retrieval.get("evidence") or []
            enriched["crawlerEvidence"] = {
                "retrievedAt": retrieval.get("retrievedAt"),
                "queriesUsed": (retrieval.get("queriesUsed") or [])[:3],
                "sources": self._compact_sources(retrieval.get("sources") or []),
                "verifiedEvidence": self._compact_evidence(
                    verified,
                    limit=self.max_verified_prompt_evidence,
                ),
                "evidence": self._compact_evidence(
                    fallback_evidence,
                    limit=self.max_fallback_prompt_evidence,
                ),
                "warnings": (retrieval.get("warnings") or [])[:2],
                "policy": {
                    "webFirst": True,
                    "catalogUsed": False,
                    "requiresCitationForExactNumbers": True,
                },
            }
        enriched["answerVerificationRules"] = [
            "Use crawlerEvidence first.",
            "No exact score/tuition/quota unless present in crawlerEvidence with URL.",
            "If evidence does not verify the requested program/score filter, say not verified.",
            "Include source labels and final source links.",
        ]
        return enriched

    def finalize_answer(
        self,
        answer: str,
        retrieval: dict[str, Any] | None,
        *,
        require_verified_data: bool = False,
    ) -> str:
        text = answer.strip()
        if require_verified_data and not self.has_verified_evidence(retrieval):
            return text
        if not retrieval:
            return text
        if "Nguồn cần kiểm tra" in text or "Nguồn tham khảo" in text:
            return text

        sources = retrieval.get("sources") or []
        if not sources:
            return text
        lines = [text.rstrip(), "", "**Nguồn cần kiểm tra:**"]
        for source in sources[:6]:
            title = source.get("title") or source.get("url")
            url = source.get("url")
            marker = "" if source.get("isOfficial") else " (nguồn tham khảo)"
            if url:
                lines.append(f"- [{title}]({url}){marker}")
            else:
                lines.append(f"- {title}{marker}")
        return "\n".join(lines)

    def format_evidence_answer(
        self,
        search_context: dict[str, Any],
        retrieval: dict[str, Any] | None,
    ) -> str | None:
        if not retrieval or not self.has_verified_evidence(retrieval):
            if self.requires_verified_data(search_context):
                return self.format_no_verified_data(search_context, retrieval)
            return None

        evidence = retrieval.get("verifiedEvidence") or retrieval.get("evidence") or []
        lines = [
            "Mình đã crawl web và chỉ tóm tắt các nguồn có thể kiểm tra được. Số liệu tuyển sinh vẫn cần đối chiếu lại trên trang chính thức trước khi chốt nguyện vọng.",
            "",
            "| Nguồn | Dữ liệu thấy được | Ghi chú |",
            "|---|---|---|",
        ]
        for item in evidence[:5]:
            title = item.get("title") or item.get("domain") or "Nguồn web"
            source_label = f"[{title}]({item.get('url')})" if item.get("url") else title
            facts = self._facts_from_evidence(item)
            note = "Nguồn chính thức" if item.get("isOfficial") else "Nguồn tham khảo, cần đối chiếu lại với trường"
            lines.append(f"| {source_label} | {facts} | {note} |")

        return self.finalize_answer("\n".join(lines), retrieval)

    def _compact_search_context(self, search_context: dict[str, Any]) -> dict[str, Any]:
        lookup = search_context.get("lookupUnderstanding") or {}
        return {
            "currentQuestion": search_context.get("currentQuestion"),
            "webSearchMode": search_context.get("webSearchMode"),
            "genericSearchQueries": (search_context.get("genericSearchQueries") or [])[:4],
            "suggestedOfficialSearchQueries": (search_context.get("suggestedOfficialSearchQueries") or [])[:3],
            "freshnessRequirement": {
                "currentDate": (search_context.get("freshnessRequirement") or {}).get("currentDate"),
                "preferredAdmissionScoreYears": (search_context.get("freshnessRequirement") or {}).get("preferredAdmissionScoreYears"),
                "preferredTuitionYear": (search_context.get("freshnessRequirement") or {}).get("preferredTuitionYear"),
            },
            "targetProgram": search_context.get("targetProgram"),
            "admissionScoreFilter": search_context.get("admissionScoreFilter"),
            "mustSatisfyFilters": (search_context.get("mustSatisfyFilters") or [])[:4],
            "lookupUnderstanding": {
                "asksAdmissionScore": lookup.get("asksAdmissionScore"),
                "asksTuition": lookup.get("asksTuition"),
                "targetRegion": lookup.get("targetRegion"),
                "targetAdmissionScoreYears": lookup.get("targetAdmissionScoreYears"),
            },
            "candidatePrograms": (search_context.get("candidatePrograms") or [])[:2],
        }

    def _compact_sources(self, sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
        compacted: list[dict[str, Any]] = []
        for source in sources[: self.max_prompt_sources]:
            compacted.append(
                {
                    "title": self._clip(source.get("title") or source.get("url"), 120),
                    "url": source.get("url"),
                    "domain": source.get("domain"),
                    "isOfficial": bool(source.get("isOfficial")),
                }
            )
        return compacted

    def _compact_evidence(
        self,
        evidence: list[dict[str, Any]],
        *,
        limit: int,
    ) -> list[dict[str, Any]]:
        compacted: list[dict[str, Any]] = []
        for item in evidence[:limit]:
            compacted.append(
                {
                    "title": self._clip(item.get("title"), 120),
                    "url": item.get("url"),
                    "domain": item.get("domain"),
                    "isOfficial": item.get("isOfficial"),
                    "matchedTargetTerms": (item.get("matchedTargetTerms") or [])[:4],
                    "yearsMentioned": item.get("yearsMentioned", []),
                    "scoreCandidates": self._compact_score_candidates(item.get("scoreCandidates") or []),
                    "tuitionCandidates": self._compact_tuition_candidates(item.get("tuitionCandidates") or []),
                    "scoreFilterSatisfied": item.get("scoreFilterSatisfied"),
                    "snippets": [
                        self._clip(snippet, self.max_prompt_snippet_chars)
                        for snippet in (item.get("snippets") or [])[:1]
                    ],
                }
            )
        return compacted

    def _compact_score_candidates(self, candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
        compacted: list[dict[str, Any]] = []
        for item in candidates[:2]:
            compacted.append(
                {
                    "value": item.get("value"),
                    "year": item.get("year"),
                    "context": self._clip(item.get("context"), self.max_prompt_score_context_chars),
                }
            )
        return compacted

    def _compact_tuition_candidates(self, candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [
            {"context": self._clip(item.get("context"), self.max_prompt_tuition_context_chars)}
            for item in candidates[:1]
        ]

    def _clip(self, value: Any, max_chars: int) -> str | None:
        if value is None:
            return None
        text = compact_whitespace(str(value))
        if len(text) <= max_chars:
            return text
        return text[: max_chars - 1].rstrip() + "…"

    def _facts_from_evidence(self, item: dict[str, Any]) -> str:
        facts: list[str] = []
        scores = item.get("scoreCandidates") or []
        if scores:
            rendered_scores = []
            for score in scores[:3]:
                year = f" {score.get('year')}" if score.get("year") else ""
                rendered_scores.append(f"{score.get('value')}{year}")
            facts.append("Điểm thấy được: " + ", ".join(rendered_scores))
        tuition = item.get("tuitionCandidates") or []
        if tuition:
            facts.append("Có đoạn về học phí")
        snippets = item.get("snippets") or []
        if not facts and snippets:
            facts.append(compact_whitespace(snippets[0])[:180])
        return "; ".join(facts) if facts else "Có nguồn liên quan nhưng chưa rút được số liệu rõ ràng"

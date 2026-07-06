# AI Career Compass (AI20K-068)

**AI Career Compass** là web app hỗ trợ học sinh THPT khám phá bản thân và thế giới nghề nghiệp trước khi chọn ngành học. Sản phẩm đóng vai trò **trợ lý khám phá nghề nghiệp an toàn, có định hướng và cá nhân hóa**; không thay thế chuyên gia tư vấn hướng nghiệp, giáo viên hoặc phụ huynh.

Ứng dụng hiện kết hợp assessment 32 câu, thuật toán matching nghề, thư viện nghề nghiệp, AI Career Coach và trang quản trị dữ liệu.

---

## Dự án hiện đang làm được gì

### Cho học sinh

- Đăng ký, đăng nhập và duy trì phiên bằng JWT trong cookie HttpOnly.
- Đăng xuất và tự cập nhật một số thông tin hồ sơ cơ bản.
- Làm bài assessment 32 câu theo thang 1-5 về môn học, sở thích, kỹ năng, cách làm việc và giá trị.
- Tạo/cập nhật hồ sơ hướng nghiệp gồm lớp, giới tính, mục tiêu, ràng buộc, sở thích, thế mạnh, môn yêu thích, giá trị và RIASEC suy luận từ assessment.
- Xem dashboard cá nhân với trạng thái assessment, mức hoàn thiện hồ sơ và top hướng nghề gần nhất.
- Nhận Top 3-5 nghề phù hợp sau khi hoàn thành assessment.
- Xem thư viện nghề nghiệp từ dữ liệu seed hiện có gồm **46 nghề** thuộc nhiều nhóm như AI & Data, Engineering, Product & Design, Business & Communication, Health & Life Sciences, Creative & Architecture.
- Mở trang chi tiết nghề để xem mô tả, môn học liên quan, ngành học, kỹ năng, nhiệm vụ công việc và hoạt động trải nghiệm nhỏ.
- Chat với AI Career Coach để:
  - giải thích hồ sơ và kết quả matching;
  - so sánh 2-3 nghề/ngành được gợi ý;
  - hỏi nghề đó học môn gì, làm việc gì, cần kỹ năng nào;
  - gợi ý hoạt động thử trong 3-7 ngày;
  - trao đổi cách xử lý áp lực từ gia đình, bạn bè hoặc xu hướng;
  - hỏi về trường/ngành, điểm chuẩn, học phí khi dữ liệu/tool hỗ trợ.
- Lưu lịch sử hội thoại AI, xem lại hội thoại, xóa từng hội thoại hoặc xóa toàn bộ.

### Cho admin

- Đăng nhập bằng vai trò `ADMIN`.
- Xem danh sách người dùng và hồ sơ học sinh.
- Tạo, sửa, khóa/mở trạng thái và xóa người dùng.
- Xem thống kê nhóm nghề nổi bật dựa trên top match của các hồ sơ đã hoàn thành assessment.
- Xem, tạo, sửa và xóa dữ liệu nghề nghiệp trong catalog.

### AI và guardrails

- AI Career Coach dùng system prompt tiếng Việt cho học sinh THPT, xưng "mình", gọi học sinh là "em".
- Guardrail backend chặn các câu ngoài phạm vi như thời tiết, nấu ăn, code/debug không liên quan hướng nghiệp.
- Các câu hỏi so sánh nghề/ngành như "so sánh 2 nghề được gợi ý cao nhất" hiện được nhận diện là đúng phạm vi.
- Khi không có `OPENAI_API_KEY`, backend trả lời bằng fallback logic thay vì làm hỏng luồng chat.
- Nếu có dấu hiệu tự làm hại, bạo lực hoặc khủng hoảng tâm lý, hệ thống dừng tư vấn nghề và hướng học sinh tìm người lớn đáng tin cậy/hỗ trợ khẩn cấp.

---

## Luồng chính

1. Học sinh đăng ký hoặc đăng nhập.
2. Học sinh làm assessment 32 câu và nhập mục tiêu/ràng buộc.
3. Backend lưu hồ sơ, tính vector/feature từ câu trả lời và tạo danh sách nghề phù hợp.
4. Trang Explore hiển thị Top 5 gợi ý nghề và thư viện nghề còn lại.
5. Học sinh xem chi tiết nghề hoặc hỏi AI Career Coach để giải thích, so sánh và lên bước thử nghiệm tiếp theo.
6. Admin có thể quản lý user, hồ sơ tổng quan và catalog nghề.

---

## Kiến trúc và công nghệ

| Lớp | Công nghệ thực tế |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, lucide-react |
| Backend | Python, FastAPI, Pydantic, psycopg connection pool |
| Database | PostgreSQL; Prisma schema/migrations/seed; Supabase-compatible |
| Auth | JWT ở backend, bcrypt hash mật khẩu, cookie HttpOnly ở frontend |
| AI | OpenAI Chat Completions; streaming SSE qua API proxy của Next.js |
| Matching | Scoring/cosine similarity trong Python; có tùy chọn pgvector qua `CAREER_MATCH_USE_PGVECTOR=true` |

Backend expose REST API; frontend gọi backend qua server actions, server components và route proxy `/api/advisor`.

---

## Cấu trúc thư mục

```text
backend/
  agents/                 # AI Career Coach, prompt, tool tra cứu trường/ngành
  core/                   # matching engine, vector features, security, cache explanation
  db/                     # truy cập PostgreSQL và seed assessment questions runtime
  routers/                # auth, assessment, careers, advisor, admin, profile
  models/                 # Pydantic schemas

frontend/
  app/                    # Next.js App Router pages và API proxy
  components/             # UI components: app shell, advisor chat, assessment form, career library
  lib/                    # auth, data fetch, labels, types, API config

prisma/
  schema.prisma
  migrations/
  seed.mjs                # seed demo users và 46 career paths
```

---

## API chính

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| `POST` | `/auth/register` | Tạo tài khoản học sinh |
| `POST` | `/auth/login` | Đăng nhập, trả JWT |
| `GET` | `/auth/me` | Lấy user hiện tại |
| `GET` | `/profile/` | Lấy hồ sơ hướng nghiệp của user |
| `POST` | `/profile/` | Cập nhật hồ sơ thủ công |
| `POST` | `/assessment/submit` | Nộp assessment và tạo/cập nhật hồ sơ |
| `GET` | `/careers/` | Lấy catalog nghề |
| `GET` | `/careers/matches` | Lấy nghề phù hợp, yêu cầu đã hoàn thành assessment |
| `GET` | `/careers/{career_id}` | Lấy chi tiết nghề |
| `POST` | `/advisor/chat` | Chat AI không streaming |
| `POST` | `/advisor/chat/stream` | Chat AI streaming SSE |
| `GET` | `/advisor/conversations` | Danh sách hội thoại |
| `GET` | `/advisor/conversations/{id}` | Chi tiết hội thoại |
| `DELETE` | `/advisor/conversations/{id}` | Xóa một hội thoại |
| `DELETE` | `/advisor/conversations` | Xóa toàn bộ hội thoại của user |
| `GET/POST/PUT/DELETE` | `/admin/users`, `/admin/careers` | Quản trị user và nghề |

---

## Yêu cầu môi trường

- Node.js 20+
- Python 3.10+
- PostgreSQL
- Khuyến nghị dùng Supabase hoặc PostgreSQL có extension `vector` nếu chạy đầy đủ Prisma migrations.

Lưu ý: `docker-compose.yml` hiện dùng image `postgres:16-alpine`. Image này không có sẵn pgvector, trong khi migration `20260624000000_add_career_feature_vector` có `CREATE EXTENSION IF NOT EXISTS vector`. Nếu chạy full migration local, hãy dùng DB có pgvector hoặc đổi image Postgres sang bản có pgvector.

---

## Chạy local

### 1. Chuẩn bị env

Copy template env cho backend và frontend:

```powershell
Copy-Item .env.example backend\.env
Copy-Item .env.example frontend\.env
```

Với Docker Postgres local, chỉnh `DATABASE_URL` trong cả hai file thành:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/career_copilot"
API_BASE_URL="http://127.0.0.1:8000"
JWT_SECRET="change-me-to-a-long-random-jwt-secret"
SESSION_SECRET="change-me-to-a-long-random-secret"
```

Biến AI tùy chọn:

```env
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"
OPENAI_TEMPERATURE="0.4"
OPENAI_MAX_TOKENS="1200"
OPENAI_WEB_SEARCH_ENABLED="true"
OPENAI_WEB_SEARCH_MODEL="gpt-5-search-api"
UNIVERSITY_CRAWL_ENABLED="true"
UNIVERSITY_CRAWL_TIMEOUT_SECONDS="4"
UNIVERSITY_CRAWL_MAX_QUERIES="3"
UNIVERSITY_CRAWL_MAX_PAGES="6"
UNIVERSITY_LOOKUP_USE_CATALOG="false"
CAREER_SCOPE_MODE="hybrid"
OPENAI_SCOPE_MODEL="gpt-4o"
OPENAI_SCOPE_CONFIDENCE_THRESHOLD="0.85"
CAREER_EXPLANATION_MODEL="gpt-4o-mini"
CAREER_MATCH_USE_PGVECTOR="false"
```

Nếu không cấu hình `OPENAI_API_KEY`, app vẫn chạy nhưng AI Coach dùng fallback demo logic.

### 2. Khởi động database

```powershell
docker-compose up -d
```

Nếu dùng Supabase hoặc DB ngoài, bỏ qua bước Docker và dùng connection string của DB đó trong `.env`.

### 3. Cài frontend dependencies

```powershell
cd frontend
npm install
```

### 4. Apply Prisma migration và seed dữ liệu

Chạy từ thư mục `frontend` để dùng Prisma CLI đã cài trong frontend:

```powershell
npx prisma generate --schema ..\prisma\schema.prisma
npx prisma migrate deploy --schema ..\prisma\schema.prisma
```

Seed demo data nằm ở `prisma/seed.mjs` và tạo:

- `admin@example.com` / `admin123`
- `student@example.com` / `student123`
- 46 nghề mẫu
- hồ sơ assessment mẫu cho student demo

Chạy seed từ môi trường Node có các dependency `@prisma/client`, `prisma`, `bcryptjs`. File seed đọc `DATABASE_URL` từ environment hiện tại, nên cần set biến này trước khi chạy:

```powershell
cd ..
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/career_copilot"
node prisma\seed.mjs
```

### 5. Chạy backend

Mở terminal mới:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend chạy tại `http://127.0.0.1:8000`.

### 6. Chạy frontend

Mở terminal mới:

```powershell
cd frontend
npm run dev
```

Frontend chạy tại `http://localhost:3000`.

---

## Tài khoản demo

| Vai trò | Email | Mật khẩu | Có thể làm gì |
| --- | --- | --- | --- |
| Admin | `admin@example.com` | `admin123` | Quản lý user, hồ sơ tổng quan, catalog nghề |
| Student | `student@example.com` | `student123` | Xem dashboard, assessment mẫu, gợi ý nghề, chat AI |

---

## Kiểm tra nhanh API

```powershell
curl http://127.0.0.1:8000/
```

Đăng nhập:

```powershell
curl -X POST http://127.0.0.1:8000/auth/login `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"student@example.com\",\"password\":\"student123\"}"
```

Lấy user hiện tại:

```powershell
curl http://127.0.0.1:8000/auth/me `
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## Giới hạn hiện tại

- Gợi ý nghề là thông tin tham khảo, không phải kết luận năng lực hay quyết định thay học sinh.
- Hệ thống chỉ hiển thị matching khi học sinh đã hoàn thành assessment hiện tại.
- Dữ liệu nghề hiện là catalog seed nội bộ, chưa phải cơ sở dữ liệu nghề quốc gia đầy đủ.
- Dữ liệu trường/ngành, điểm chuẩn, học phí cần đối chiếu nguồn tuyển sinh chính thức; live search chỉ hoạt động khi cấu hình model/API phù hợp.
- Docker local mặc định chưa đảm bảo pgvector; full migration cần DB hỗ trợ `vector`.
- Admin dashboard có CRUD cơ bản và thống kê top cluster, chưa phải hệ thống báo cáo phân tích nâng cao.

---

## Scripts hữu ích

Frontend:

```powershell
cd frontend
npm run dev
npm run build
npm run lint
npm run typecheck
```

Backend:

```powershell
cd backend
uvicorn main:app --reload
python -m py_compile agents\career_advisor.py agents\prompts\system_prompts.py
```

---

## Tài liệu liên quan

- `docs/architecture_diagram.md`: mô tả kiến trúc và luồng dữ liệu.
- `docs/eval_evidences.md`: bằng chứng đánh giá/chạy thử.
- `prisma/schema.prisma`: schema database hiện tại.
- `backend/agents/prompts/system_prompts.py`: system prompts cho AI Career Coach và agent giải thích nghề.

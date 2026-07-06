import json
import os
import re
import unicodedata
from datetime import date
from typing import Any


SCHOOL_LOOKUP_SIGNALS = [
    "truong",
    "dai hoc",
    "hoc vien",
    "diem",
    "diem chuan",
    "hoc phi",
    "xet tuyen",
    "to hop",
    "nganh nao",
    "nganh nay",
    "ngành này",
    "nguyen vong",
    "nguyện vọng",
    "nen hoc o dau",
    "nên học ở đâu",
    "co hoi",
    "viec lam",
]


LIVE_LOOKUP_SIGNALS = [
    "diem chuan",
    "hoc phi",
    "chi tieu",
    "phuong thuc",
    "xet tuyen",
    "mấy năm",
    "may nam",
    "gan day",
    "gần đây",
    "bao nhieu",
    "bao nhiêu",
    "nam nay",
    "năm nay",
    "nam gan nhat",
    "năm gần nhất",
    "moi nhat",
    "mới nhất",
]


WIDE_SCHOOL_SEARCH_SIGNALS = [
    "tim truong",
    "tim cac truong",
    "truong nao",
    "cac truong",
    "goi y truong",
    "danh sach truong",
    "nen hoc truong nao",
    "co truong nao",
]


PROGRAM_FOCUS_GROUPS: list[dict[str, Any]] = [
    {
        "canonicalName": "Công nghệ thông tin / Kỹ thuật phần mềm / Khoa học máy tính",
        "aliases": [
            "lap trinh",
            "lap trinh vien",
            "code",
            "coder",
            "developer",
            "software",
            "phan mem",
            "ky thuat phan mem",
            "cong nghe thong tin",
            "cntt",
            "khoa hoc may tinh",
            "he thong thong tin",
            "an toan thong tin",
            "frontend",
            "backend",
            "fullstack",
            "full stack",
        ],
        "searchTerms": [
            "công nghệ thông tin",
            "kỹ thuật phần mềm",
            "khoa học máy tính",
            "hệ thống thông tin",
            "an toàn thông tin",
        ],
    },
]


PRONOUN_CONTEXT_SIGNALS = [
    "nganh nay",
    "ngành này",
    "truong nay",
    "trường này",
    "huong do",
    "hướng đó",
    "cai nay",
    "cái này",
    "cac truong nay",
    "các trường này",
    "nhung truong nay",
    "những trường này",
    "cac truong do",
    "các trường đó",
    "nhung truong do",
    "những trường đó",
    "cac truong tren",
    "các trường trên",
    "nhung truong tren",
    "những trường trên",
    "cac lua chon nay",
    "các lựa chọn này",
    "nhu nao",
    "như nào",
]


REGION_ALIASES = {
    "mien bac": "Miền Bắc",
    "ha noi": "Miền Bắc",
    "hn": "Miền Bắc",
    "mien trung": "Miền Trung",
    "da nang": "Miền Trung",
    "hue": "Miền Trung",
    "mien nam": "Miền Nam",
    "tp hcm": "Miền Nam",
    "tp.hcm": "Miền Nam",
    "tp. hcm": "Miền Nam",
    "tphcm": "Miền Nam",
    "sai gon": "Miền Nam",
    "ho chi minh": "Miền Nam",
}


OFFICIAL_DOMAIN_HINTS = {
    "Đại học Bách khoa Hà Nội": ["hust.edu.vn", "ts.hust.edu.vn"],
    "Trường Đại học Công nghệ - ĐHQG Hà Nội": ["uet.vnu.edu.vn", "tuyensinh.uet.vnu.edu.vn", "vnu.edu.vn"],
    "Học viện Công nghệ Bưu chính Viễn thông": ["ptit.edu.vn", "tuyensinh.ptit.edu.vn"],
    "Đại học Bách khoa - ĐHQG TP.HCM": ["hcmut.edu.vn", "tuyensinh.hcmut.edu.vn", "vnuhcm.edu.vn"],
    "Đại học Sư phạm Kỹ thuật TP.HCM": ["hcmute.edu.vn", "tuyensinh.hcmute.edu.vn"],
    "Đại học Xây dựng Hà Nội": ["huce.edu.vn", "tuyensinh.huce.edu.vn"],
    "Trường Đại học Công nghệ Thông tin - ĐHQG TP.HCM": ["uit.edu.vn", "tuyensinh.uit.edu.vn", "vnuhcm.edu.vn"],
    "Đại học FPT": ["daihoc.fpt.edu.vn", "fpt.edu.vn"],
    "Đại học Kinh tế Quốc dân": ["neu.edu.vn", "tuyensinh.neu.edu.vn"],
    "Đại học Kinh tế TP.HCM": ["ueh.edu.vn", "tuyensinh.ueh.edu.vn"],
    "Đại học Kiến trúc TP.HCM": ["uah.edu.vn", "tuyensinh.uah.edu.vn"],
    "Trường Đại học Y Hà Nội": ["hmu.edu.vn", "tuyensinh.hmu.edu.vn"],
    "Trường Đại học Y Dược - ĐHQG Hà Nội": ["ump.vnu.edu.vn", "vnu.edu.vn"],
    "Trường Đại học Y tế công cộng": ["huph.edu.vn", "tuyensinh.huph.edu.vn"],
    "Học viện Quân y": ["hocvienquany.vn", "vmmu.edu.vn"],
    "Trường Đại học Phenikaa": ["phenikaa-uni.edu.vn"],
    "Trường Đại học Y Dược TP.HCM": ["ump.edu.vn"],
    "Trường Đại học Y khoa Phạm Ngọc Thạch": ["pts.pnt.edu.vn", "pqldt.pnt.edu.vn", "pnt.edu.vn"],
    "Trường Đại học Khoa học Sức khỏe - ĐHQG TP.HCM": ["medvnu.edu.vn", "vnuhcm.edu.vn"],
    "Trường Đại học Nguyễn Tất Thành": ["ntt.edu.vn", "tuyensinh.ntt.edu.vn"],
}


UNIVERSITY_PROGRAM_CATALOG: list[dict[str, Any]] = [
    {
        "schoolName": "Trường Đại học Y Dược TP.HCM",
        "aliases": ["ump hcm", "ump tphcm", "dai hoc y duoc tphcm", "y duoc tphcm", "yds"],
        "city": "TP.HCM",
        "region": "Miền Nam",
        "schoolType": "Công lập",
        "programName": "Y khoa / Bác sĩ đa khoa",
        "careerKeywords": [
            "bac si da khoa",
            "bac si",
            "y khoa",
            "y da khoa",
            "hoc y",
            "nganh y",
            "khoa hoc suc khoe",
            "suc khoe",
        ],
        "competitiveness": "Rất cao",
        "admissionScoreNote": (
            "Y khoa thuộc nhóm cạnh tranh rất cao; cần tra điểm chuẩn THPT năm gần nhất trên thông báo chính thức của trường."
        ),
        "tuitionNote": (
            "Học phí cần xem theo ngành Y khoa, khóa tuyển sinh và đề án/thông báo học phí mới nhất của trường."
        ),
        "opportunityNote": (
            "Phù hợp hướng bác sĩ lâm sàng, bệnh viện tuyến cuối, nghiên cứu y học và đào tạo sau đại học tại TP.HCM."
        ),
        "officialSourceHints": [
            "Website tuyển sinh/đào tạo Trường Đại học Y Dược TP.HCM",
            "Thông báo điểm chuẩn và học phí năm gần nhất của UMP TP.HCM",
        ],
    },
    {
        "schoolName": "Trường Đại học Y khoa Phạm Ngọc Thạch",
        "aliases": ["pnt", "pham ngoc thach", "dai hoc y khoa pham ngoc thach"],
        "city": "TP.HCM",
        "region": "Miền Nam",
        "schoolType": "Công lập",
        "programName": "Y khoa / Bác sĩ đa khoa",
        "careerKeywords": [
            "bac si da khoa",
            "bac si",
            "y khoa",
            "y da khoa",
            "hoc y",
            "nganh y",
            "khoa hoc suc khoe",
            "suc khoe",
        ],
        "competitiveness": "Rất cao",
        "admissionScoreNote": (
            "Điểm chuẩn cần xem theo ngành Y khoa, nhóm đối tượng/khu vực tuyển sinh và phương thức xét tuyển từng năm."
        ),
        "tuitionNote": (
            "Học phí cần đối chiếu thông báo theo khóa tuyển sinh mới nhất của trường."
        ),
        "opportunityNote": (
            "Phù hợp hướng bác sĩ lâm sàng tại hệ thống bệnh viện và cơ sở y tế TP.HCM."
        ),
        "officialSourceHints": [
            "Website Trường Đại học Y khoa Phạm Ngọc Thạch",
            "Thông báo tuyển sinh, điểm chuẩn và học phí năm gần nhất của PNT",
        ],
    },
    {
        "schoolName": "Trường Đại học Khoa học Sức khỏe - ĐHQG TP.HCM",
        "aliases": [
            "dai hoc khoa hoc suc khoe",
            "khoa hoc suc khoe dhqg tphcm",
            "medvnu",
            "khoa y dhqg tphcm",
        ],
        "city": "TP.HCM",
        "region": "Miền Nam",
        "schoolType": "Công lập",
        "programName": "Y khoa / Dược học / Răng Hàm Mặt",
        "careerKeywords": [
            "bac si da khoa",
            "bac si",
            "y khoa",
            "y da khoa",
            "hoc y",
            "nganh y",
            "duoc",
            "rang ham mat",
            "khoa hoc suc khoe",
        ],
        "competitiveness": "Cao",
        "admissionScoreNote": (
            "Cần kiểm tra theo ngành Y khoa/Dược/Răng Hàm Mặt và phương thức xét tuyển của ĐHQG TP.HCM."
        ),
        "tuitionNote": (
            "Học phí thay đổi theo chương trình và khóa tuyển sinh; cần xem đề án/thông báo học phí mới nhất."
        ),
        "opportunityNote": (
            "Phù hợp hướng y khoa, sức khỏe, nghiên cứu liên ngành trong hệ sinh thái ĐHQG TP.HCM."
        ),
        "officialSourceHints": [
            "Website Trường Đại học Khoa học Sức khỏe - ĐHQG TP.HCM",
            "Cổng thông tin tuyển sinh ĐHQG TP.HCM",
        ],
    },
    {
        "schoolName": "Trường Đại học Nguyễn Tất Thành",
        "aliases": ["ntt", "nguyen tat thanh", "dai hoc nguyen tat thanh"],
        "city": "TP.HCM",
        "region": "Miền Nam",
        "schoolType": "Tư thục",
        "programName": "Y khoa / Dược học / Điều dưỡng",
        "careerKeywords": [
            "bac si da khoa",
            "bac si",
            "y khoa",
            "y da khoa",
            "hoc y",
            "nganh y",
            "duoc",
            "dieu duong",
            "khoa hoc suc khoe",
        ],
        "competitiveness": "Theo phương thức xét tuyển riêng",
        "admissionScoreNote": (
            "Cần xem ngưỡng đảm bảo chất lượng đầu vào khối sức khỏe và điểm trúng tuyển theo từng phương thức."
        ),
        "tuitionNote": (
            "Học phí thuộc nhóm tư thục; cần kiểm tra học phí ngành Y khoa/Dược theo khóa tuyển sinh mới nhất."
        ),
        "opportunityNote": (
            "Phù hợp nếu em muốn thêm lựa chọn tư thục tại TP.HCM trong khối khoa học sức khỏe."
        ),
        "officialSourceHints": [
            "Trang tuyển sinh Trường Đại học Nguyễn Tất Thành",
            "Thông báo học phí và tuyển sinh khối sức khỏe mới nhất của trường",
        ],
    },
    {
        "schoolName": "Trường Đại học Y Hà Nội",
        "aliases": ["hmu", "dai hoc y ha noi", "y ha noi", "dai hoc yhn"],
        "city": "Hà Nội",
        "region": "Miền Bắc",
        "schoolType": "Công lập",
        "programName": "Y khoa / Bác sĩ đa khoa",
        "careerKeywords": [
            "bac si da khoa",
            "bac si",
            "y khoa",
            "y da khoa",
            "hoc y",
            "nganh y",
            "khoa hoc suc khoe",
            "suc khoe",
        ],
        "competitiveness": "Rất cao",
        "admissionScoreNote": (
            "Y khoa là ngành rất cạnh tranh; khi tra cứu phải ưu tiên điểm chuẩn THPT năm gần nhất có công bố chính thức."
        ),
        "tuitionNote": (
            "Học phí cần xem theo khóa tuyển sinh và chương trình đào tạo trong đề án/thông báo mới nhất của trường."
        ),
        "opportunityNote": (
            "Phù hợp hướng bác sĩ lâm sàng, nghiên cứu y học, bệnh viện, cơ sở y tế và đào tạo sau đại học."
        ),
        "officialSourceHints": [
            "Trang tuyển sinh Trường Đại học Y Hà Nội",
            "Thông báo điểm chuẩn và đề án tuyển sinh năm gần nhất của HMU",
        ],
    },
    {
        "schoolName": "Trường Đại học Y Dược - ĐHQG Hà Nội",
        "aliases": [
            "ump",
            "ump vnu",
            "dai hoc y duoc dhqg ha noi",
            "y duoc dhqg ha noi",
            "truong dai hoc y duoc dai hoc quoc gia ha noi",
        ],
        "city": "Hà Nội",
        "region": "Miền Bắc",
        "schoolType": "Công lập",
        "programName": "Y khoa / Dược học / Răng Hàm Mặt",
        "careerKeywords": [
            "bac si da khoa",
            "bac si",
            "y khoa",
            "y da khoa",
            "hoc y",
            "nganh y",
            "duoc",
            "rang ham mat",
            "khoa hoc suc khoe",
        ],
        "competitiveness": "Cao",
        "admissionScoreNote": (
            "Điểm chuẩn cần xem theo ngành Y khoa/Dược/Răng Hàm Mặt và phương thức xét tuyển của ĐHQG Hà Nội."
        ),
        "tuitionNote": (
            "Học phí phụ thuộc ngành và khóa tuyển sinh; cần đối chiếu đề án hoặc thông báo học phí mới nhất."
        ),
        "opportunityNote": (
            "Phù hợp hướng y khoa, dược, răng hàm mặt, nghiên cứu và hệ sinh thái đào tạo của ĐHQG Hà Nội."
        ),
        "officialSourceHints": [
            "Trang tuyển sinh Trường Đại học Y Dược - ĐHQG Hà Nội",
            "Thông báo điểm chuẩn và đề án tuyển sinh năm gần nhất của UMP-VNU",
        ],
    },
    {
        "schoolName": "Trường Đại học Y tế công cộng",
        "aliases": ["huph", "dai hoc y te cong cong", "y te cong cong"],
        "city": "Hà Nội",
        "region": "Miền Bắc",
        "schoolType": "Công lập",
        "programName": "Y tế công cộng / Kỹ thuật xét nghiệm y học / Dinh dưỡng",
        "careerKeywords": [
            "y te cong cong",
            "y hoc du phong",
            "dinh duong",
            "xet nghiem y hoc",
            "khoa hoc suc khoe",
            "suc khoe cong dong",
            "hoc y",
            "nganh y",
        ],
        "competitiveness": "Trung bình đến khá",
        "admissionScoreNote": (
            "Không phải lựa chọn trực tiếp cho Bác sĩ đa khoa; điểm chuẩn cần xem theo từng ngành sức khỏe cộng đồng."
        ),
        "tuitionNote": (
            "Học phí cần đối chiếu theo ngành, khóa tuyển sinh và thông báo học phí mới nhất của trường."
        ),
        "opportunityNote": (
            "Phù hợp hướng sức khỏe cộng đồng, y tế dự phòng, dinh dưỡng, xét nghiệm và quản lý chương trình y tế."
        ),
        "officialSourceHints": [
            "Trang tuyển sinh Trường Đại học Y tế công cộng",
            "Đề án tuyển sinh và thông báo học phí năm gần nhất của HUPH",
        ],
    },
    {
        "schoolName": "Học viện Quân y",
        "aliases": ["hoc vien quan y", "quan y", "vmma", "vmmu"],
        "city": "Hà Nội",
        "region": "Miền Bắc",
        "schoolType": "Quân đội",
        "programName": "Y khoa / Bác sĩ đa khoa",
        "careerKeywords": [
            "bac si da khoa",
            "bac si",
            "y khoa",
            "y da khoa",
            "hoc y",
            "quan y",
            "nganh y",
            "khoa hoc suc khoe",
        ],
        "competitiveness": "Rất cao, có điều kiện sơ tuyển riêng",
        "admissionScoreNote": (
            "Điểm chuẩn và điều kiện tuyển sinh tách theo hệ quân sự/dân sự, giới tính và khu vực; phải kiểm tra đề án mới nhất."
        ),
        "tuitionNote": (
            "Chính sách học phí/phụ cấp phụ thuộc hệ đào tạo quân sự hoặc dân sự; cần đối chiếu thông báo chính thức."
        ),
        "opportunityNote": (
            "Phù hợp hướng bác sĩ quân y, bệnh viện quân đội, y khoa lâm sàng và môi trường đào tạo kỷ luật cao."
        ),
        "officialSourceHints": [
            "Website Học viện Quân y",
            "Đề án tuyển sinh của Bộ Quốc phòng/Học viện Quân y năm gần nhất",
        ],
    },
    {
        "schoolName": "Trường Đại học Phenikaa",
        "aliases": ["phenikaa", "dai hoc phenikaa"],
        "city": "Hà Nội",
        "region": "Miền Bắc",
        "schoolType": "Tư thục",
        "programName": "Y khoa / Dược học / Điều dưỡng",
        "careerKeywords": [
            "bac si da khoa",
            "bac si",
            "y khoa",
            "y da khoa",
            "hoc y",
            "duoc",
            "dieu duong",
            "nganh y",
            "khoa hoc suc khoe",
        ],
        "competitiveness": "Theo phương thức xét tuyển riêng",
        "admissionScoreNote": (
            "Cần xem điều kiện xét tuyển và ngưỡng đầu vào khối sức khỏe theo từng năm, từng phương thức."
        ),
        "tuitionNote": (
            "Học phí thuộc nhóm tư thục; cần kiểm tra học phí ngành Y khoa/Dược theo khóa tuyển sinh mới nhất."
        ),
        "opportunityNote": (
            "Phù hợp nếu em muốn thêm lựa chọn tư thục tại Hà Nội trong khối khoa học sức khỏe."
        ),
        "officialSourceHints": [
            "Trang tuyển sinh Trường Đại học Phenikaa",
            "Thông báo học phí và đề án tuyển sinh mới nhất của trường",
        ],
    },
    {
        "schoolName": "Đại học Bách khoa Hà Nội",
        "aliases": ["hust", "bkhn", "bach khoa ha noi"],
        "city": "Hà Nội",
        "region": "Miền Bắc",
        "schoolType": "Công lập",
        "programName": "Kỹ thuật Điện tử - Viễn thông / Kỹ thuật Điện",
        "careerKeywords": [
            "ky su dien dien tu",
            "dien dien tu",
            "dien tu vien thong",
            "iot",
            "embedded",
            "tu dong hoa",
            "robot",
        ],
        "competitiveness": "Rất cao",
        "admissionScoreNote": (
            "Điểm chuẩn thay đổi theo năm và phương thức; nhóm ngành này thường thuộc nhóm cạnh tranh cao. "
            "Cần kiểm tra điểm chuẩn chính thức theo năm tuyển sinh và mã chương trình."
        ),
        "tuitionNote": (
            "Học phí phụ thuộc chương trình chuẩn/chất lượng cao/quốc tế và năm học. "
            "Cần kiểm tra đề án tuyển sinh hoặc trang tài chính sinh viên của trường."
        ),
        "opportunityNote": (
            "Phù hợp các hướng phần cứng, nhúng, viễn thông, tự động hóa, IoT, sản xuất công nghiệp và R&D."
        ),
        "officialSourceHints": [
            "Trang tuyển sinh chính thức của Đại học Bách khoa Hà Nội",
            "Đề án tuyển sinh năm gần nhất của trường",
        ],
    },
    {
        "schoolName": "Đại học Bách khoa Hà Nội",
        "aliases": ["hust", "bkhn", "bach khoa ha noi"],
        "city": "Hà Nội",
        "region": "Miền Bắc",
        "schoolType": "Công lập",
        "programName": "Kỹ thuật Cơ khí / Cơ điện tử / Kỹ thuật Ô tô",
        "careerKeywords": [
            "ky su co khi",
            "co khi",
            "co dien tu",
            "oto",
            "o to",
            "che tao may",
            "robot",
            "tu dong hoa",
        ],
        "competitiveness": "Rất cao",
        "admissionScoreNote": (
            "Điểm chuẩn cần xem theo từng mã chương trình cơ khí, cơ điện tử hoặc ô tô và từng phương thức xét tuyển."
        ),
        "tuitionNote": (
            "Học phí phụ thuộc chương trình chuẩn/chất lượng cao/quốc tế và năm học; cần kiểm tra đề án tuyển sinh mới nhất."
        ),
        "opportunityNote": (
            "Phù hợp hướng thiết kế cơ khí, chế tạo máy, cơ điện tử, robot, kỹ thuật ô tô, sản xuất và R&D."
        ),
        "officialSourceHints": [
            "Trang tuyển sinh chính thức của Đại học Bách khoa Hà Nội",
            "Đề án tuyển sinh năm gần nhất của trường",
        ],
    },
    {
        "schoolName": "Trường Đại học Công nghệ - ĐHQG Hà Nội",
        "aliases": ["uet", "dai hoc cong nghe", "dh cong nghe", "vnu uet"],
        "city": "Hà Nội",
        "region": "Miền Bắc",
        "schoolType": "Công lập",
        "programName": "Kỹ thuật Điện tử - Viễn thông / Khoa học máy tính",
        "careerKeywords": [
            "ky su dien dien tu",
            "dien tu vien thong",
            "may tinh",
            "ai",
            "du lieu",
            "phan mem",
            "iot",
        ],
        "competitiveness": "Cao",
        "admissionScoreNote": (
            "Điểm chuẩn cần đối chiếu theo từng mã ngành và phương thức xét tuyển của ĐHQG Hà Nội."
        ),
        "tuitionNote": (
            "Học phí thay đổi theo chương trình đào tạo; cần kiểm tra thông báo tuyển sinh chính thức."
        ),
        "opportunityNote": (
            "Mạnh ở hướng công nghệ, điện tử viễn thông, phần mềm, AI, hệ thống thông minh và nghiên cứu."
        ),
        "officialSourceHints": [
            "Trang tuyển sinh Trường Đại học Công nghệ - ĐHQG Hà Nội",
            "Cổng tuyển sinh ĐHQG Hà Nội",
        ],
    },
    {
        "schoolName": "Học viện Công nghệ Bưu chính Viễn thông",
        "aliases": ["ptit", "buu chinh vien thong", "hoc vien cong nghe buu chinh"],
        "city": "Hà Nội / TP.HCM",
        "region": "Miền Bắc, Miền Nam",
        "schoolType": "Công lập",
        "programName": "Kỹ thuật Điện tử Viễn thông / Công nghệ thông tin / An toàn thông tin",
        "careerKeywords": [
            "dien tu vien thong",
            "vien thong",
            "mang",
            "an toan thong tin",
            "phan mem",
            "ky su dien dien tu",
        ],
        "competitiveness": "Cao",
        "admissionScoreNote": (
            "Điểm chuẩn khác nhau giữa cơ sở Hà Nội, cơ sở TP.HCM và từng phương thức xét tuyển."
        ),
        "tuitionNote": (
            "Học phí phụ thuộc chương trình và cơ sở đào tạo; cần kiểm tra thông báo học phí từng năm."
        ),
        "opportunityNote": (
            "Phù hợp hướng viễn thông, mạng, hạ tầng số, phần mềm, bảo mật và doanh nghiệp công nghệ."
        ),
        "officialSourceHints": [
            "Cổng tuyển sinh PTIT",
            "Thông báo điểm chuẩn và học phí của từng cơ sở PTIT",
        ],
    },
    {
        "schoolName": "Đại học Bách khoa - ĐHQG TP.HCM",
        "aliases": ["hcmut", "bach khoa tphcm", "bach khoa tp hcm"],
        "city": "TP.HCM",
        "region": "Miền Nam",
        "schoolType": "Công lập",
        "programName": "Kỹ thuật Điện - Điện tử / Khoa học máy tính / Tự động hóa",
        "careerKeywords": [
            "ky su dien dien tu",
            "dien dien tu",
            "tu dong hoa",
            "robot",
            "may tinh",
            "phan mem",
            "du lieu",
        ],
        "competitiveness": "Rất cao",
        "admissionScoreNote": (
            "Điểm chuẩn cần xem theo mã ngành, phương thức xét tuyển tổng hợp/THPT và chương trình chuẩn/chất lượng cao."
        ),
        "tuitionNote": (
            "Học phí khác nhau giữa chương trình chuẩn, tiên tiến, chất lượng cao và chương trình tiếng Anh."
        ),
        "opportunityNote": (
            "Phù hợp hướng kỹ thuật lõi, sản xuất, tự động hóa, điện tử, phần mềm kỹ thuật và doanh nghiệp công nghệ."
        ),
        "officialSourceHints": [
            "Cổng tuyển sinh Đại học Bách khoa - ĐHQG TP.HCM",
            "Đề án tuyển sinh và thông báo học phí năm gần nhất",
        ],
    },
    {
        "schoolName": "Đại học Bách khoa - ĐHQG TP.HCM",
        "aliases": ["hcmut", "bach khoa tphcm", "bach khoa tp hcm"],
        "city": "TP.HCM",
        "region": "Miền Nam",
        "schoolType": "Công lập",
        "programName": "Kỹ thuật Cơ khí / Cơ điện tử / Kỹ thuật Ô tô",
        "careerKeywords": [
            "ky su co khi",
            "co khi",
            "co dien tu",
            "oto",
            "o to",
            "che tao may",
            "robot",
            "tu dong hoa",
            "san xuat",
        ],
        "competitiveness": "Rất cao",
        "admissionScoreNote": (
            "Điểm chuẩn cần xem theo mã ngành cơ khí/cơ điện tử/ô tô, phương thức xét tuyển và chương trình đào tạo."
        ),
        "tuitionNote": (
            "Học phí khác nhau giữa chương trình chuẩn, chất lượng cao, tiên tiến và chương trình tiếng Anh."
        ),
        "opportunityNote": (
            "Phù hợp hướng thiết kế, chế tạo, tự động hóa sản xuất, robot, kỹ thuật ô tô và vận hành nhà máy."
        ),
        "officialSourceHints": [
            "Cổng tuyển sinh Đại học Bách khoa - ĐHQG TP.HCM",
            "Đề án tuyển sinh và thông báo học phí năm gần nhất",
        ],
    },
    {
        "schoolName": "Đại học Sư phạm Kỹ thuật TP.HCM",
        "aliases": ["hcmute", "su pham ky thuat tphcm", "spkt tphcm"],
        "city": "TP.HCM",
        "region": "Miền Nam",
        "schoolType": "Công lập",
        "programName": "Công nghệ Kỹ thuật Điện - Điện tử / Điện tử Viễn thông / Tự động hóa",
        "careerKeywords": [
            "ky su dien dien tu",
            "dien dien tu",
            "dien tu vien thong",
            "tu dong hoa",
            "co dien tu",
            "robot",
        ],
        "competitiveness": "Khá cao",
        "admissionScoreNote": (
            "Điểm chuẩn cần xem theo ngành, chương trình đại trà/chất lượng cao và phương thức xét tuyển."
        ),
        "tuitionNote": (
            "Học phí phụ thuộc chương trình đào tạo; nên kiểm tra thông báo học phí từng khóa."
        ),
        "opportunityNote": (
            "Phù hợp hướng ứng dụng kỹ thuật, nhà máy, tự động hóa, thiết kế mạch, bảo trì và triển khai hệ thống."
        ),
        "officialSourceHints": [
            "Trang tuyển sinh Đại học Sư phạm Kỹ thuật TP.HCM",
            "Thông báo điểm chuẩn theo từng phương thức xét tuyển",
        ],
    },
    {
        "schoolName": "Đại học Sư phạm Kỹ thuật TP.HCM",
        "aliases": ["hcmute", "su pham ky thuat tphcm", "spkt tphcm"],
        "city": "TP.HCM",
        "region": "Miền Nam",
        "schoolType": "Công lập",
        "programName": "Công nghệ Kỹ thuật Cơ khí / Cơ điện tử / Kỹ thuật Ô tô",
        "careerKeywords": [
            "ky su co khi",
            "co khi",
            "co dien tu",
            "oto",
            "o to",
            "che tao may",
            "bao tri",
            "san xuat",
        ],
        "competitiveness": "Khá cao",
        "admissionScoreNote": (
            "Điểm chuẩn cần xem theo ngành, chương trình đại trà/chất lượng cao và phương thức xét tuyển."
        ),
        "tuitionNote": (
            "Học phí phụ thuộc chương trình đào tạo; nên kiểm tra thông báo học phí từng khóa."
        ),
        "opportunityNote": (
            "Phù hợp hướng cơ khí ứng dụng, cơ điện tử, kỹ thuật ô tô, bảo trì, vận hành và cải tiến dây chuyền."
        ),
        "officialSourceHints": [
            "Trang tuyển sinh Đại học Sư phạm Kỹ thuật TP.HCM",
            "Thông báo điểm chuẩn theo từng phương thức xét tuyển",
        ],
    },
    {
        "schoolName": "Đại học Xây dựng Hà Nội",
        "aliases": ["huce", "xay dung ha noi", "dai hoc xay dung"],
        "city": "Hà Nội",
        "region": "Miền Bắc",
        "schoolType": "Công lập",
        "programName": "Kỹ thuật Xây dựng / Kinh tế xây dựng / Kiến trúc",
        "careerKeywords": [
            "ky su xay dung",
            "xay dung",
            "cong trinh",
            "ket cau",
            "cau duong",
            "kien truc",
            "du an",
        ],
        "competitiveness": "Khá cao",
        "admissionScoreNote": (
            "Điểm chuẩn cần xem theo ngành xây dựng, kiến trúc, kinh tế xây dựng và phương thức xét tuyển."
        ),
        "tuitionNote": (
            "Học phí thay đổi theo chương trình và năm học; cần kiểm tra đề án tuyển sinh hoặc thông báo tài chính."
        ),
        "opportunityNote": (
            "Phù hợp hướng thiết kế, thi công, giám sát công trình, quản lý dự án, kết cấu và hạ tầng."
        ),
        "officialSourceHints": [
            "Trang tuyển sinh Đại học Xây dựng Hà Nội",
            "Đề án tuyển sinh và thông báo học phí năm gần nhất",
        ],
    },
    {
        "schoolName": "Trường Đại học Công nghệ Thông tin - ĐHQG TP.HCM",
        "aliases": ["uit", "dai hoc cong nghe thong tin"],
        "city": "TP.HCM",
        "region": "Miền Nam",
        "schoolType": "Công lập",
        "programName": "Khoa học máy tính / Kỹ thuật phần mềm / Khoa học dữ liệu",
        "careerKeywords": [
            "lap trinh",
            "phan mem",
            "ky su phan mem",
            "ai",
            "du lieu",
            "khoa hoc du lieu",
            "an toan thong tin",
        ],
        "competitiveness": "Cao",
        "admissionScoreNote": (
            "Điểm chuẩn cần xem theo mã ngành và phương thức xét tuyển của ĐHQG TP.HCM."
        ),
        "tuitionNote": (
            "Học phí khác nhau giữa chương trình chuẩn, chất lượng cao và chương trình tiên tiến."
        ),
        "opportunityNote": (
            "Phù hợp hướng phần mềm, AI, dữ liệu, bảo mật, sản phẩm số và startup công nghệ."
        ),
        "officialSourceHints": [
            "Cổng tuyển sinh UIT",
            "Cổng tuyển sinh ĐHQG TP.HCM",
        ],
    },
    {
        "schoolName": "Đại học FPT",
        "aliases": ["fpt university", "dai hoc fpt"],
        "city": "Hà Nội / TP.HCM / Đà Nẵng / Cần Thơ / Quy Nhơn",
        "region": "Toàn quốc",
        "schoolType": "Tư thục",
        "programName": "Kỹ thuật phần mềm / Trí tuệ nhân tạo / Thiết kế mỹ thuật số / Marketing số",
        "careerKeywords": [
            "phan mem",
            "ai",
            "du lieu",
            "thiet ke",
            "my thuat so",
            "marketing",
            "digital marketing",
        ],
        "competitiveness": "Theo phương thức riêng",
        "admissionScoreNote": (
            "Trường thường dùng nhiều phương thức xét tuyển; cần xem điều kiện từng năm thay vì chỉ nhìn điểm THPT."
        ),
        "tuitionNote": (
            "Học phí thuộc nhóm tư thục, cần tính cả học kỳ tiếng Anh/nền tảng nếu có."
        ),
        "opportunityNote": (
            "Phù hợp học theo định hướng thực hành, doanh nghiệp, phần mềm, AI, thiết kế số và marketing số."
        ),
        "officialSourceHints": [
            "Trang tuyển sinh Đại học FPT",
            "Thông báo học phí theo từng campus và chương trình",
        ],
    },
    {
        "schoolName": "Đại học Kinh tế Quốc dân",
        "aliases": ["neu", "kinh te quoc dan"],
        "city": "Hà Nội",
        "region": "Miền Bắc",
        "schoolType": "Công lập",
        "programName": "Marketing / Kinh doanh quốc tế / Tài chính / Phân tích kinh doanh",
        "careerKeywords": [
            "marketing",
            "kinh doanh",
            "tai chinh",
            "phan tich kinh doanh",
            "du lieu kinh doanh",
            "logistics",
        ],
        "competitiveness": "Cao",
        "admissionScoreNote": (
            "Điểm chuẩn thay đổi mạnh theo ngành và phương thức; các ngành hot thường cạnh tranh cao."
        ),
        "tuitionNote": (
            "Học phí khác nhau giữa chương trình chuẩn, tiên tiến, chất lượng cao và liên kết quốc tế."
        ),
        "opportunityNote": (
            "Phù hợp hướng kinh doanh, marketing, tài chính, phân tích dữ liệu kinh doanh và quản trị."
        ),
        "officialSourceHints": [
            "Trang tuyển sinh Đại học Kinh tế Quốc dân",
            "Đề án tuyển sinh và biểu học phí năm gần nhất",
        ],
    },
    {
        "schoolName": "Đại học Kinh tế TP.HCM",
        "aliases": ["ueh", "kinh te tphcm", "kinh te tp hcm"],
        "city": "TP.HCM",
        "region": "Miền Nam",
        "schoolType": "Công lập",
        "programName": "Marketing / Kinh doanh quốc tế / Tài chính / Công nghệ tài chính",
        "careerKeywords": [
            "marketing",
            "kinh doanh",
            "tai chinh",
            "fintech",
            "phan tich kinh doanh",
            "logistics",
        ],
        "competitiveness": "Cao",
        "admissionScoreNote": (
            "Điểm chuẩn phụ thuộc campus, chương trình, phương thức xét tuyển và tổ hợp."
        ),
        "tuitionNote": (
            "Học phí cần xem theo chương trình chuẩn/chất lượng cao/quốc tế và từng năm học."
        ),
        "opportunityNote": (
            "Phù hợp hướng kinh doanh, tài chính, marketing, phân tích dữ liệu, fintech và quản trị."
        ),
        "officialSourceHints": [
            "Trang tuyển sinh UEH",
            "Thông báo học phí và đề án tuyển sinh UEH năm gần nhất",
        ],
    },
    {
        "schoolName": "Đại học Kiến trúc TP.HCM",
        "aliases": ["uah", "kien truc tphcm", "kien truc tp hcm"],
        "city": "TP.HCM",
        "region": "Miền Nam",
        "schoolType": "Công lập",
        "programName": "Thiết kế đồ họa / Thiết kế công nghiệp / Kiến trúc",
        "careerKeywords": [
            "thiet ke",
            "do hoa",
            "my thuat",
            "kien truc",
            "ux",
            "ui",
            "san pham",
        ],
        "competitiveness": "Theo năng khiếu và xét tuyển",
        "admissionScoreNote": (
            "Điểm chuẩn có thể gồm điểm năng khiếu hoặc phương thức riêng; cần xem kỹ điều kiện môn vẽ/năng khiếu."
        ),
        "tuitionNote": (
            "Học phí cần kiểm tra theo ngành và khóa tuyển sinh; ngành thiết kế có thể phát sinh chi phí vật liệu/đồ án."
        ),
        "opportunityNote": (
            "Phù hợp hướng thiết kế đồ họa, thiết kế sản phẩm, kiến trúc, nhận diện thương hiệu và UI/UX nền tảng."
        ),
        "officialSourceHints": [
            "Trang tuyển sinh Đại học Kiến trúc TP.HCM",
            "Thông báo tuyển sinh các ngành năng khiếu",
        ],
    },
]


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.lower())
    normalized = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    return normalized.replace("đ", "d")


class UniversityLookupTool:
    """Builds a web-first university/program lookup context.

    The legacy catalog is kept only as an explicit fallback. By default this
    tool extracts intent and filters, then asks the advisor to crawl/search the
    web instead of answering from hard-coded school/program data.
    """

    def __init__(
        self,
        catalog: list[dict[str, Any]] | None = None,
        use_catalog_fallback: bool | None = None,
    ) -> None:
        self.catalog = catalog or UNIVERSITY_PROGRAM_CATALOG
        if use_catalog_fallback is None:
            use_catalog_fallback = os.getenv("UNIVERSITY_LOOKUP_USE_CATALOG", "false").lower() in (
                "1",
                "true",
                "yes",
            )
        self.use_catalog_fallback = use_catalog_fallback

    def is_relevant(self, message: str, history: list | None = None) -> bool:
        haystack = self._combined_text(message, history)
        return any(signal in haystack for signal in SCHOOL_LOOKUP_SIGNALS)

    def lookup(
        self,
        message: str,
        advisor_context: dict[str, Any],
        history: list | None = None,
        limit: int = 5,
    ) -> dict[str, Any] | None:
        if not self.is_relevant(message, history):
            return None

        query_text = self._query_text(message, advisor_context, history)
        filters = self._extract_filters(message)
        mention_text = (
            f"{message} {self._combined_text('', history)}"
            if self._needs_history_context(message)
            else message
        )
        has_program_anchor = self._has_program_anchor(mention_text)
        target_program = self._extract_program_focus(mention_text)
        asks_admission_score = self._asks_admission_score(message)
        asks_tuition = self._asks_tuition(message)
        mentioned_records = self._mentioned_records(mention_text)
        wide_web_search = self._should_use_wide_web_search(
            message=message,
            has_program_anchor=has_program_anchor,
            mentioned_records=mentioned_records,
            filters=filters,
            asks_admission_score=asks_admission_score,
        )
        web_search_mode = "candidate" if mentioned_records and not wide_web_search else "broad"
        candidate_records = (
            mentioned_records or self.catalog
            if self.use_catalog_fallback and web_search_mode != "broad"
            else []
        )
        scored_records = []

        for record in candidate_records:
            if self._is_region_mismatch(record, filters):
                continue
            score, signals = self._score_record(record, query_text, filters)
            if mentioned_records:
                score += 20
                signals = [record["schoolName"], *signals]
            if score > 0:
                scored_records.append((score, signals, record))

        scored_records.sort(key=lambda item: (-item[0], item[2]["schoolName"]))
        results = [
            self._to_result(record, signals)
            for _, signals, record in scored_records[:limit]
        ]

        return {
            "isRelevant": True,
            "toolName": "UniversityLookupTool",
            "queryUnderstanding": {
                "rawMessage": message,
                "queryText": query_text,
                "hasProgramAnchor": has_program_anchor,
                "targetProgram": target_program,
                "targetYear": filters.get("targetYear"),
                "targetAdmissionScoreYears": self._admission_score_years(filters.get("targetYear")),
                "admissionScoreYearCount": 2,
                "targetRegion": filters.get("targetRegion"),
                "budgetPreference": filters.get("budgetPreference"),
                "admissionScoreFilter": filters.get("admissionScoreFilter"),
                "asksAdmissionScore": asks_admission_score,
                "asksTuition": asks_tuition,
                "webSearchMode": web_search_mode,
                "mentionedSchools": list(
                    dict.fromkeys(record["schoolName"] for record in mentioned_records)
                ),
                "needsLiveSearch": (
                    not self.use_catalog_fallback
                    or wide_web_search
                    or bool(filters.get("admissionScoreFilter"))
                    or bool(target_program and asks_admission_score)
                    or self.needs_live_search(message)
                    or asks_admission_score
                    or asks_tuition
                    or (has_program_anchor and not results)
                ),
            },
            "catalogCoverage": {
                "candidateCount": len(results),
                "coverage": (
                    "web_first_catalog_disabled"
                    if not self.use_catalog_fallback
                    else "matched" if results else "no_local_match"
                ),
                "policy": (
                    "Web-first mode: không dùng catalog hard-code để kết luận tên trường/ngành hoặc số liệu tuyển sinh. "
                    "Phải tra cứu web theo currentQuestion/genericSearchQueries; nếu vẫn không có nguồn đủ chắc thì nói rõ chưa tìm được dữ liệu phù hợp."
                ),
            },
            "dataSourcePolicy": {
                "webFirst": True,
                "catalogFallbackEnabled": self.use_catalog_fallback,
                "exactNumbersRequireSource": True,
            },
            "dataFreshnessPolicy": (
                "Điểm chuẩn, học phí và chỉ tiêu thay đổi theo từng năm. "
                "Chỉ dùng số liệu exact nếu result có admissionScores/tuitionItems kèm năm và nguồn; "
                "nếu không có thì phải nói là cần kiểm tra nguồn tuyển sinh chính thức."
            ),
            "missingInfoQuestions": self._missing_info_questions(
                filters,
                asks_admission_score=asks_admission_score,
                asks_tuition=asks_tuition,
            ),
            "results": results,
        }

    def needs_live_search(self, message: str) -> bool:
        normalized = normalize_text(message)
        return any(normalize_text(signal) in normalized for signal in LIVE_LOOKUP_SIGNALS)

    def _asks_admission_score(self, message: str) -> bool:
        normalized = normalize_text(message)
        signals = [
            "diem chuan",
            "diem nganh",
            "diem cac truong",
            "diem truong",
            "diem trung tuyen",
            "diem tuyen sinh",
            "diem dau vao",
            "diem nam",
            "bao nhieu diem",
        ]
        return any(signal in normalized for signal in signals)

    def _asks_tuition(self, message: str) -> bool:
        normalized = normalize_text(message)
        return any(signal in normalized for signal in ["hoc phi", "chi phi", "bao nhieu tien"])

    def _contains_normalized_term(self, normalized: str, term: str) -> bool:
        normalized_term = normalize_text(term)
        if not normalized_term:
            return False
        if len(normalized_term) <= 4 or " " not in normalized_term:
            return re.search(rf"(?<![a-z0-9]){re.escape(normalized_term)}(?![a-z0-9])", normalized) is not None
        return normalized_term in normalized

    def _extract_program_focus(self, message: str) -> dict[str, Any] | None:
        normalized = normalize_text(message)
        for group in PROGRAM_FOCUS_GROUPS:
            matched_terms = [
                alias
                for alias in group["aliases"]
                if self._contains_normalized_term(normalized, alias)
            ]
            if matched_terms:
                return {
                    "canonicalName": group["canonicalName"],
                    "matchedTerms": matched_terms[:5],
                    "searchTerms": group["searchTerms"],
                }

        program_phrase = self._extract_program_phrase(normalized)
        if not program_phrase:
            return None
        return {
            "canonicalName": program_phrase,
            "matchedTerms": [program_phrase],
            "searchTerms": [program_phrase],
        }

    def _extract_program_phrase(self, normalized: str) -> str | None:
        patterns = [
            r"(?:nganh|nghe|huong|linh vuc)\s+(.+?)(?=,|\s+diem|\s+hoc phi|\s+o\s+|\s+tai\s+|\s+mien\s+|\s+duoi\s+|\s+tren\s+|\s+tu\s+\d|$)",
            r"(?:cho|ve)\s+(.+?)(?=,|\s+diem|\s+hoc phi|\s+o\s+|\s+tai\s+|\s+mien\s+|\s+duoi\s+|\s+tren\s+|\s+tu\s+\d|$)",
        ]
        stop_words = {"nay", "nao", "phu hop", "truong", "cac truong"}
        for pattern in patterns:
            match = re.search(pattern, normalized)
            if not match:
                continue
            phrase = re.sub(r"\s+", " ", match.group(1)).strip()
            if not phrase or phrase in stop_words or len(phrase) < 3:
                continue
            return phrase[:80]
        return None

    def _extract_admission_score_filter(self, message: str) -> dict[str, Any] | None:
        normalized = normalize_text(message).replace(",", ".")
        number = r"(\d{1,2}(?:\.\d{1,2})?)"

        range_patterns = [
            rf"(?:tu|khoang)\s*{number}\s*(?:den|toi|-)\s*{number}",
            rf"{number}\s*-\s*{number}\s*(?:diem)?",
        ]
        for pattern in range_patterns:
            match = re.search(pattern, normalized)
            if match:
                lower = self._parse_score_number(match.group(1))
                upper = self._parse_score_number(match.group(2))
                if lower is None or upper is None:
                    continue
                if lower > upper:
                    lower, upper = upper, lower
                return {
                    "operator": "range",
                    "min": lower,
                    "max": upper,
                    "inclusive": True,
                    "label": f"từ {self._format_score(lower)} đến {self._format_score(upper)} điểm",
                }

        max_patterns = [
            (rf"(?:duoi|nho hon|thap hon|it hon)\s*(?:muc\s*)?{number}", False, "dưới"),
            (rf"(?:khong qua|toi da|khong vuot qua|<=)\s*(?:muc\s*)?{number}", True, "không quá"),
            (rf"<\s*{number}", False, "dưới"),
            (rf"<=\s*{number}", True, "không quá"),
            (rf"{number}\s*(?:diem\s*)?(?:tro xuong|do xuong)", True, "không quá"),
        ]
        for pattern, inclusive, label_prefix in max_patterns:
            match = re.search(pattern, normalized)
            if not match:
                continue
            value = self._parse_score_number(match.group(1))
            if value is None:
                continue
            return {
                "operator": "max",
                "value": value,
                "inclusive": inclusive,
                "label": f"{label_prefix} {self._format_score(value)} điểm",
            }

        min_patterns = [
            (rf"(?:tren|cao hon|lon hon)\s*(?:muc\s*)?{number}", False, "trên"),
            (rf"(?:toi thieu|tu|>=)\s*(?:muc\s*)?{number}", True, "từ"),
            (rf">\s*{number}", False, "trên"),
            (rf">=\s*{number}", True, "từ"),
            (rf"{number}\s*(?:diem\s*)?(?:tro len|do len)", True, "từ"),
        ]
        for pattern, inclusive, label_prefix in min_patterns:
            match = re.search(pattern, normalized)
            if not match:
                continue
            value = self._parse_score_number(match.group(1))
            if value is None:
                continue
            return {
                "operator": "min",
                "value": value,
                "inclusive": inclusive,
                "label": f"{label_prefix} {self._format_score(value)} điểm",
            }

        return None

    def _parse_score_number(self, raw_value: str) -> float | None:
        try:
            value = float(raw_value)
        except (TypeError, ValueError):
            return None
        if 0 <= value <= 30:
            return value
        return None

    def _format_score(self, value: float) -> str:
        if float(value).is_integer():
            return str(int(value))
        return f"{value:.2f}".rstrip("0").rstrip(".")

    def _should_use_wide_web_search(
        self,
        message: str,
        has_program_anchor: bool,
        mentioned_records: list[dict[str, Any]],
        filters: dict[str, Any],
        asks_admission_score: bool,
    ) -> bool:
        if not has_program_anchor or mentioned_records:
            return False
        normalized = normalize_text(message)
        asks_wide_school_search = any(signal in normalized for signal in WIDE_SCHOOL_SEARCH_SIGNALS)
        return bool(
            filters.get("admissionScoreFilter")
            or (asks_admission_score and "truong" in normalized)
            or asks_wide_school_search
        )

    def format_fallback(self, lookup: dict[str, Any]) -> str:
        results = lookup.get("results", [])
        if not results:
            understanding = lookup.get("queryUnderstanding", {})
            target_region = understanding.get("targetRegion")
            region_text = f" tại {target_region}" if target_region else ""
            return (
                f"Mình chưa tìm được trường/ngành phù hợp đủ chắc{region_text} cho yêu cầu này. "
                "Câu hỏi vẫn thuộc phạm vi hướng nghiệp/chọn trường, nhưng hiện chưa có dữ liệu xác thực để gợi ý tên trường cụ thể. "
                "Em có thể cho mình thêm tên ngành chính xác trên đề án tuyển sinh, hoặc cho phép mở rộng sang khu vực khác để mình lọc tiếp."
            )

        understanding = lookup.get("queryUnderstanding", {})
        asks_numbers = bool(
            understanding.get("asksAdmissionScore") or understanding.get("asksTuition")
        )

        lines = [
            "Mình có thể gợi ý một số trường/ngành để em kiểm tra tiếp. "
            "Điểm chuẩn, học phí và chỉ tiêu thay đổi theo từng năm, nên cần đối chiếu nguồn tuyển sinh chính thức.\n",
        ]

        if asks_numbers:
            score_years = understanding.get("targetAdmissionScoreYears") or []
            score_columns = [f"Điểm chuẩn {year}" for year in score_years[:2]]
            if not score_columns:
                score_columns = ["Điểm chuẩn năm gần nhất", "Điểm chuẩn năm trước đó"]
            lines.extend(
                [
                    f"| Trường | Ngành gần nhất | Khu vực | {' | '.join(score_columns)} | Học phí |",
                    "|---|---|---|---|---|---|",
                ]
            )
        else:
            lines.extend(
                [
                    "| Trường | Ngành gần nhất | Khu vực | Mức cạnh tranh | Lưu ý |",
                    "|---|---|---|---|---|",
                ]
            )

        for item in results[:5]:
            if asks_numbers:
                score_note = (
                    "Cần tra cứu live từ nguồn tuyển sinh chính thức"
                    if understanding.get("asksAdmissionScore")
                    else item["admissionScoreNote"]
                )
                lines.append(
                    f"| {item['schoolName']} | {item['programName']} | {item['region']} | "
                    f"{score_note} | {score_note} | {item['tuitionNote']} |"
                )
            else:
                lines.append(
                    "| {schoolName} | {programName} | {region} | {competitiveness} | {opportunityNote} |".format(
                        **item
                    )
                )

        questions = lookup.get("missingInfoQuestions") or []
        if questions:
            lines.append("\nĐể lọc chính xác hơn, em trả lời thêm: " + " ".join(questions[:2]))

        return "\n".join(lines)

    def build_web_search_input(
        self,
        message: str,
        advisor_context: dict[str, Any],
        lookup: dict[str, Any],
        history: list | None = None,
    ) -> str:
        recent_history = []
        for turn in (history or [])[-6:]:
            role = getattr(turn, "role", None) or (
                turn.get("role") if isinstance(turn, dict) else None
            )
            content = getattr(turn, "content", None) or (
                turn.get("content") if isinstance(turn, dict) else None
            )
            if role in ("user", "assistant") and content:
                recent_history.append({"role": role, "content": str(content)[:700]})

        understanding = lookup.get("queryUnderstanding", {})
        broad_web_search = understanding.get("webSearchMode") == "broad"
        candidate_programs = []
        if not broad_web_search:
            candidate_programs = [
                {
                    "schoolName": item.get("schoolName"),
                    "programName": item.get("programName"),
                    "city": item.get("city"),
                    "region": item.get("region"),
                    "fitReason": item.get("fitReason"),
                    "officialDomains": OFFICIAL_DOMAIN_HINTS.get(item.get("schoolName"), [])[:3],
                    "officialSourceHints": item.get("officialSourceHints", [])[:2],
                }
                for item in lookup.get("results", [])[:5]
            ]

        has_program_anchor = bool(understanding.get("hasProgramAnchor"))
        recommended_careers = []
        if not (broad_web_search or has_program_anchor):
            recommended_careers = [
                {
                    "title": item.get("title"),
                    "score": item.get("score"),
                    "majors": item.get("majors", [])[:3],
                }
                for item in advisor_context.get("recommendedCareers", [])[:3]
            ]

        target_program = understanding.get("targetProgram")
        admission_score_filter = understanding.get("admissionScoreFilter")

        compact_context = {
            "currentQuestion": message,
            "webSearchMode": understanding.get("webSearchMode", "candidate"),
            "suggestedOfficialSearchQueries": self._official_search_queries(
                message,
                candidate_programs,
                broad_web_search=broad_web_search,
            ),
            "genericSearchQueries": self._generic_search_queries(
                message,
                history,
                target_program=target_program,
                admission_score_filter=admission_score_filter,
                target_region=understanding.get("targetRegion"),
            ),
            "freshnessRequirement": self._freshness_requirement(),
            "recentConversation": recent_history,
            "recommendedCareers": recommended_careers,
            "targetProgram": target_program,
            "admissionScoreFilter": admission_score_filter,
            "mustSatisfyFilters": self._web_search_constraints(
                target_program,
                admission_score_filter,
                understanding.get("targetRegion"),
                broad_web_search,
            ),
            "lookupUnderstanding": understanding,
            "catalogCoverage": lookup.get("catalogCoverage", {}),
            "dataSourcePolicy": lookup.get("dataSourcePolicy", {}),
            "retrievalPolicy": {
                "mode": "crawl_internet_first",
                "localCatalogAllowed": self.use_catalog_fallback,
                "exactAdmissionDataRequiresUrl": True,
                "doNotUseCatalogForSchoolFacts": not self.use_catalog_fallback,
            },
            "candidatePrograms": candidate_programs,
        }

        return (
            "Hãy tra cứu web để trả lời câu hỏi tuyển sinh sau. "
            "Ưu tiên nguồn chính thức và trích dẫn nguồn trong câu trả lời.\n\n"
            + json.dumps(compact_context, ensure_ascii=False, indent=2)
        )

    def append_sources(self, text: str, response: Any) -> str:
        sources = self._extract_sources(response)
        if not sources:
            return text

        if "Nguồn cần kiểm tra" in text or "Nguồn tham khảo" in text:
            return text

        lines = [text.rstrip(), "", "**Nguồn cần kiểm tra:**"]
        for source in sources[:5]:
            title = source.get("title") or source.get("url")
            url = source.get("url")
            if url:
                lines.append(f"- [{title}]({url})")
            else:
                lines.append(f"- {title}")
        return "\n".join(lines)

    def _combined_text(self, message: str, history: list | None) -> str:
        parts = [message]
        for turn in (history or [])[-6:]:
            content = getattr(turn, "content", None) or (
                turn.get("content") if isinstance(turn, dict) else None
            )
            if content:
                parts.append(str(content))
        return normalize_text(" ".join(parts))

    def _query_text(
        self,
        message: str,
        advisor_context: dict[str, Any],
        history: list | None,
    ) -> str:
        parts = [message]
        if self._needs_history_context(message):
            parts.append(self._combined_text("", history))

        # Do not let unrelated recommended careers pollute a specific school/program query.
        # Example: "bác sĩ đa khoa ở TP.HCM" must not pull in IT schools just because
        # another recommendedCareer contains software/data keywords.
        if not self._has_program_anchor(" ".join(parts)):
            for career in advisor_context.get("recommendedCareers", [])[:2]:
                parts.append(str(career.get("title", "")))
                parts.extend(career.get("majors", []) or [])
                parts.extend(career.get("subjects", []) or [])
                parts.extend(career.get("jobSkills", []) or [])
        return normalize_text(" ".join(parts))

    def _official_search_queries(
        self,
        message: str,
        candidate_programs: list[dict[str, Any]],
        broad_web_search: bool = False,
    ) -> list[str]:
        if broad_web_search:
            return []

        queries = []
        freshness = self._freshness_requirement()
        admission_years = freshness["preferredAdmissionScoreYears"]
        tuition_year = freshness["preferredTuitionYear"]
        for item in candidate_programs[:3]:
            school = item.get("schoolName")
            program = item.get("programName")
            domains = item.get("officialDomains") or []
            for domain in domains[:2]:
                queries.append(f"{message} {school} site:{domain}")
                queries.append(
                    f"{school} {program} điểm chuẩn {' '.join(map(str, admission_years))} học phí {tuition_year} site:{domain}"
                )
        return queries[:10]

    def _generic_search_queries(
        self,
        message: str,
        history: list | None,
        target_program: dict[str, Any] | None = None,
        admission_score_filter: dict[str, Any] | None = None,
        target_region: str | None = None,
    ) -> list[str]:
        history_context = self._combined_text("", history) if self._needs_history_context(message) else ""
        focus = " ".join(part for part in [message, history_context] if part).strip()
        if not focus:
            focus = message

        years_text = " ".join(map(str, self._admission_score_years()))
        score_text = self._score_filter_query_text(admission_score_filter)
        region_text = f" {target_region}" if target_region else ""
        if target_program:
            queries = []
            search_terms = target_program.get("searchTerms") or [target_program.get("canonicalName")]
            for term in [str(item) for item in search_terms if item][:5]:
                queries.extend(
                    [
                        f"điểm chuẩn {term} {score_text} {years_text} trường đại học{region_text}",
                        f"trường đại học ngành {term} {score_text} điểm chuẩn {years_text}{region_text}",
                    ]
                )
            queries.append(f"{focus} tuyển sinh đại học Việt Nam điểm chuẩn {years_text}")
            return self._dedupe_queries(queries)[:10]

        return [
            f"{focus} trường đại học ngành phù hợp tuyển sinh",
            f"{focus} điểm chuẩn {years_text}",
            f"{focus} học phí {self._freshness_requirement()['preferredTuitionYear']}",
            f"{focus} chương trình đào tạo đại học Việt Nam",
        ]

    def _dedupe_queries(self, queries: list[str]) -> list[str]:
        deduped = []
        seen = set()
        for query in queries:
            normalized = re.sub(r"\s+", " ", query).strip()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            deduped.append(normalized)
        return deduped

    def _score_filter_query_text(self, score_filter: dict[str, Any] | None) -> str:
        if not score_filter:
            return ""
        operator = score_filter.get("operator")
        if operator in {"range", "max", "min"}:
            return str(score_filter.get("label") or "").strip()
        return ""

    def _web_search_constraints(
        self,
        target_program: dict[str, Any] | None,
        admission_score_filter: dict[str, Any] | None,
        target_region: str | None,
        broad_web_search: bool,
    ) -> list[str]:
        constraints = []
        if broad_web_search:
            constraints.append(
                "Search broadly on the web; candidatePrograms is intentionally empty so the hard-coded local catalog must not limit results."
            )
        if target_program:
            terms = ", ".join((target_program.get("searchTerms") or [])[:5])
            constraints.append(
                f"Only return programs matching the target program group: {target_program.get('canonicalName')} ({terms})."
            )
        if admission_score_filter:
            constraints.append(
                f"Only present a school/program as a match if the cited admission score satisfies: {admission_score_filter.get('label')}."
            )
        if target_region:
            constraints.append(f"Prefer or filter to region: {target_region}.")
        constraints.append(
            "If a result does not satisfy the target program and score constraints with a cited source, say it is not verified instead of substituting another major."
        )
        return constraints

    def _admission_score_years(self, target_year: int | None = None) -> list[int]:
        if target_year:
            return [target_year, target_year - 1]
        today = date.today()
        latest_completed = today.year if today.month >= 9 else today.year - 1
        return [latest_completed, latest_completed - 1]

    def _freshness_requirement(self) -> dict[str, Any]:
        today = date.today()
        admission_years = self._admission_score_years()
        return {
            "currentDate": today.isoformat(),
            "preferredAdmissionScoreYear": admission_years[0],
            "preferredAdmissionScoreYears": admission_years,
            "admissionScoreYearCount": 2,
            "preferredTuitionYear": today.year,
            "rule": (
                "Khi học sinh hỏi điểm chuẩn, bắt buộc tra 2 năm tuyển sinh gần nhất có nguồn xác thực. "
                "Với điểm chuẩn, nếu năm hiện tại chưa công bố điểm trúng tuyển cuối cùng, "
                "dùng năm tuyển sinh đã hoàn tất gần nhất và năm liền trước đó. "
                "Với học phí, dùng khóa/năm học mới nhất đã công bố."
            ),
        }

    def _needs_history_context(self, message: str) -> bool:
        normalized = normalize_text(message)
        return any(normalize_text(signal) in normalized for signal in PRONOUN_CONTEXT_SIGNALS)

    def _has_program_anchor(self, text: str) -> bool:
        normalized = normalize_text(text)
        anchors = [
            "bac si", "y khoa", "y da khoa", "hoc y", "nganh y", "duoc",
            "dieu duong", "dinh duong", "chuyen gia dinh duong",
            "rang ham mat", "ky su", "ki su", "moi truong",
            "ky su moi truong", "ki su moi truong", "co khi", "dien dien tu",
            "cong nghe thong tin", "phan mem", "marketing", "tai chinh",
            "ke toan", "kien truc", "thiet ke", "xay dung",
        ]
        if any(anchor in normalized for anchor in anchors):
            return True
        if not self.use_catalog_fallback:
            return False
        for record in self.catalog:
            if any(normalize_text(keyword) in normalized for keyword in record["careerKeywords"]):
                return True
        return bool(self._mentioned_records(text))

    def _is_region_mismatch(self, record: dict[str, Any], filters: dict[str, Any]) -> bool:
        target_region = filters.get("targetRegion")
        if not target_region:
            return False
        return target_region not in record["region"] and record["region"] != "Toàn quốc"

    def _mentioned_records(self, message: str) -> list[dict[str, Any]]:
        if not self.use_catalog_fallback:
            return []
        normalized = normalize_text(message)
        records = []
        for record in self.catalog:
            names = [record["schoolName"], *record.get("aliases", [])]
            if any(normalize_text(name) in normalized for name in names):
                records.append(record)
        return records

    def _extract_filters(self, message: str) -> dict[str, Any]:
        normalized = normalize_text(message)
        filters: dict[str, Any] = {}

        year_match = re.search(r"\b(20\d{2})\b", normalized)
        if year_match:
            filters["targetYear"] = int(year_match.group(1))

        admission_score_filter = self._extract_admission_score_filter(message)
        if admission_score_filter:
            filters["admissionScoreFilter"] = admission_score_filter

        for alias, region in REGION_ALIASES.items():
            if alias in normalized:
                filters["targetRegion"] = region
                break

        if any(term in normalized for term in ["hoc phi thap", "re", "ngan sach thap", "it tien"]):
            filters["budgetPreference"] = "low"
        elif any(term in normalized for term in ["tu thuc", "quoc te", "chat luong cao"]):
            filters["budgetPreference"] = "flexible"

        return filters

    def _score_record(
        self,
        record: dict[str, Any],
        query_text: str,
        filters: dict[str, Any],
    ) -> tuple[int, list[str]]:
        score = 0
        signals: list[str] = []

        for keyword in record["careerKeywords"]:
            normalized_keyword = normalize_text(keyword)
            if normalized_keyword in query_text:
                score += 4
                signals.append(keyword)

        for alias in record.get("aliases", []):
            if normalize_text(alias) in query_text:
                score += 6
                signals.append(alias)

        normalized_program = normalize_text(record["programName"])
        if "bac si da khoa" in query_text:
            if "bac si da khoa" in normalized_program:
                score += 6
            elif "y khoa" in normalized_program:
                score += 3
        elif "y khoa" in query_text and "y khoa" in normalized_program:
            score += 3

        school_words = normalize_text(record["schoolName"]).split()
        if len(school_words) >= 2 and all(word in query_text for word in school_words[:2]):
            score += 3

        target_region = filters.get("targetRegion")
        if target_region and score > 0:
            if target_region in record["region"] or record["region"] == "Toàn quốc":
                score += 2
            else:
                score -= 2

        if filters.get("budgetPreference") == "low" and record["schoolType"] == "Công lập":
            score += 1

        return max(score, 0), list(dict.fromkeys(signals))[:5]

    def _to_result(self, record: dict[str, Any], signals: list[str]) -> dict[str, Any]:
        return {
            "schoolName": record["schoolName"],
            "programName": record["programName"],
            "city": record["city"],
            "region": record["region"],
            "schoolType": record["schoolType"],
            "competitiveness": record["competitiveness"],
            "matchedSignals": signals,
            "fitReason": self._fit_reason(record, signals),
            "admissionScores": [],
            "admissionScoreNote": record["admissionScoreNote"],
            "tuitionItems": [],
            "tuitionNote": record["tuitionNote"],
            "opportunityNote": record["opportunityNote"],
            "officialSourceHints": record["officialSourceHints"],
        }

    def _fit_reason(self, record: dict[str, Any], signals: list[str]) -> str:
        if signals:
            return (
                f"Khớp với các tín hiệu ngành/nghề: {', '.join(signals[:3])}. "
                f"Chương trình gần nhất là {record['programName']}."
            )
        return f"Chương trình {record['programName']} có liên quan tới hướng nghề đang được tư vấn."

    def _extract_sources(self, response: Any) -> list[dict[str, str]]:
        try:
            payload = response.model_dump()
        except AttributeError:
            payload = response

        sources: list[dict[str, str]] = []
        seen: set[str] = set()

        def add_source(item: dict[str, Any]) -> None:
            url = item.get("url") or item.get("source_url")
            title = item.get("title") or item.get("name") or url
            if not url or url in seen:
                return
            seen.add(url)
            sources.append({"title": str(title), "url": str(url)})

        def walk(value: Any) -> None:
            if isinstance(value, dict):
                if value.get("type") == "url_citation":
                    add_source(value)
                for key in ("sources", "results", "annotations"):
                    nested = value.get(key)
                    if isinstance(nested, list):
                        for item in nested:
                            if isinstance(item, dict):
                                if item.get("url") or item.get("source_url"):
                                    add_source(item)
                                walk(item)
                for nested in value.values():
                    if isinstance(nested, (dict, list)):
                        walk(nested)
            elif isinstance(value, list):
                for item in value:
                    walk(item)

        walk(payload)
        return sources

    def _missing_info_questions(
        self,
        filters: dict[str, Any],
        asks_admission_score: bool = False,
        asks_tuition: bool = False,
    ) -> list[str]:
        questions = []
        if not filters.get("targetRegion"):
            questions.append("Em muốn học ở miền Bắc, miền Trung hay miền Nam?")
        if not filters.get("targetYear") and not asks_admission_score and not asks_tuition:
            questions.append("Em cần điểm chuẩn/học phí của năm tuyển sinh nào?")
        if not filters.get("budgetPreference") and not asks_admission_score:
            questions.append("Ngân sách học phí của gia đình khoảng bao nhiêu mỗi năm?")
        return questions

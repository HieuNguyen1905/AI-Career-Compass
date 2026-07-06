// import pkg from "@prisma/client";
import pkg from "@prisma/client";

const { PrismaClient, Role, UserStatus } = pkg;
import bcrypt from "bcryptjs";

const prismaDatabaseUrl =
  process.env.DATABASE_URL?.includes("pooler.supabase.com") && !process.env.DATABASE_URL.includes("pgbouncer=true")
    ? `${process.env.DATABASE_URL}${process.env.DATABASE_URL.includes("?") ? "&" : "?"}pgbouncer=true`
    : process.env.DATABASE_URL;

const prisma = new PrismaClient(
  prismaDatabaseUrl
    ? {
        datasources: {
          db: {
            url: prismaDatabaseUrl
          }
        }
      }
    : undefined
);

const careerPaths = [
  {
    "title": "Khoa học dữ liệu giáo dục",
    "cluster": "AI & Data",
    "summary": "Phân tích dữ liệu học tập, xây mô hình dự đoán và tạo insight giúp nhà trường hỗ trợ học sinh tốt hơn.",
    "subjects": [
      "Toán",
      "Tin học",
      "Tiếng Anh"
    ],
    "jobSkills": [
      "logic",
      "phân tích dữ liệu",
      "lập trình",
      "giao tiếp"
    ],
    "majors": [
      "Khoa học dữ liệu",
      "Công nghệ giáo dục",
      "Hệ thống thông tin",
      "Công nghệ thông tin"
    ],
    "activities": [
      "Làm dashboard điểm số giả lập",
      "Học Python căn bản",
      "Phỏng vấn giáo viên về dữ liệu lớp học"
    ]
  },
  {
    "title": "Data Analyst",
    "cluster": "AI & Data",
    "summary": "Thu thập, làm sạch và phân tích dữ liệu để hỗ trợ doanh nghiệp hoặc tổ chức ra quyết định.",
    "subjects": [
      "Toán",
      "Tin học",
      "Tiếng Anh"
    ],
    "jobSkills": [
      "phân tích dữ liệu",
      "Excel",
      "SQL",
      "tư duy logic",
      "trình bày dữ liệu"
    ],
    "majors": [
      "Khoa học dữ liệu",
      "Hệ thống thông tin",
      "Công nghệ thông tin",
      "Thống kê"
    ],
    "activities": [
      "Phân tích bảng chi tiêu cá nhân bằng Excel",
      "Tạo biểu đồ từ một bộ dữ liệu công khai",
      "Học SQL cơ bản và viết 5 câu truy vấn đơn giản"
    ]
  },
  {
    "title": "AI/Machine Learning Engineer",
    "cluster": "AI & Data",
    "summary": "Xây dựng mô hình AI giúp máy tính nhận diện mẫu, dự đoán kết quả hoặc tự động hóa tác vụ.",
    "subjects": [
      "Toán",
      "Tin học",
      "Tiếng Anh"
    ],
    "jobSkills": [
      "lập trình",
      "xác suất thống kê",
      "machine learning",
      "kiên trì",
      "đọc tài liệu"
    ],
    "majors": [
      "Trí tuệ nhân tạo",
      "Khoa học máy tính",
      "Khoa học dữ liệu",
      "Công nghệ thông tin"
    ],
    "activities": [
      "Train một mô hình phân loại ảnh đơn giản",
      "Tìm hiểu supervised learning qua video",
      "Làm notebook dự đoán điểm số giả lập"
    ]
  },
  {
    "title": "Business Intelligence Analyst",
    "cluster": "AI & Data",
    "summary": "Biến dữ liệu kinh doanh thành báo cáo, dashboard và insight dễ hiểu cho đội ngũ quản lý.",
    "subjects": [
      "Toán",
      "Tin học",
      "Kinh tế"
    ],
    "jobSkills": [
      "Power BI",
      "Excel",
      "SQL",
      "phân tích kinh doanh",
      "giao tiếp"
    ],
    "majors": [
      "Hệ thống thông tin quản lý",
      "Kinh doanh số",
      "Khoa học dữ liệu",
      "Quản trị kinh doanh"
    ],
    "activities": [
      "Thiết kế dashboard doanh thu giả lập",
      "So sánh 2 sản phẩm bằng biểu đồ",
      "Viết 1 trang insight từ dữ liệu bán hàng mẫu"
    ]
  },
  {
    "title": "Kỹ sư phần mềm",
    "cluster": "Engineering",
    "summary": "Xây dựng web/app, hệ thống backend và công cụ tự động hóa để giải quyết bài toán thực tế.",
    "subjects": [
      "Tin học",
      "Toán",
      "Vật lý"
    ],
    "jobSkills": [
      "lập trình",
      "giải quyết vấn đề",
      "kiên trì",
      "làm việc nhóm"
    ],
    "majors": [
      "Kỹ thuật phần mềm",
      "Khoa học máy tính",
      "Công nghệ thông tin",
      "Hệ thống thông tin"
    ],
    "activities": [
      "Làm một web app nhỏ",
      "Tham gia câu lạc bộ lập trình",
      "Đọc tài liệu API và thử tích hợp"
    ]
  },
  {
    "title": "Frontend Developer",
    "cluster": "Engineering",
    "summary": "Xây dựng giao diện website hoặc ứng dụng để người dùng tương tác dễ dàng và đẹp mắt.",
    "subjects": [
      "Tin học",
      "Mỹ thuật",
      "Tiếng Anh"
    ],
    "jobSkills": [
      "HTML",
      "CSS",
      "JavaScript",
      "tư duy giao diện",
      "chú ý chi tiết"
    ],
    "majors": [
      "Công nghệ thông tin",
      "Kỹ thuật phần mềm",
      "Thiết kế tương tác",
      "Truyền thông đa phương tiện"
    ],
    "activities": [
      "Clone giao diện một landing page",
      "Làm portfolio cá nhân bằng HTML/CSS",
      "Thử dùng React để tạo một form đơn giản"
    ]
  },
  {
    "title": "Backend Developer",
    "cluster": "Engineering",
    "summary": "Xây dựng API, xử lý dữ liệu, phân quyền và logic phía server cho web/app.",
    "subjects": [
      "Tin học",
      "Toán",
      "Tiếng Anh"
    ],
    "jobSkills": [
      "lập trình",
      "database",
      "API",
      "bảo mật cơ bản",
      "debug"
    ],
    "majors": [
      "Kỹ thuật phần mềm",
      "Khoa học máy tính",
      "Công nghệ thông tin",
      "Hệ thống thông tin"
    ],
    "activities": [
      "Tạo API quản lý danh sách việc cần làm",
      "Thiết kế database đơn giản",
      "Tìm hiểu JWT authentication"
    ]
  },
  {
    "title": "Mobile App Developer",
    "cluster": "Engineering",
    "summary": "Phát triển ứng dụng chạy trên điện thoại, tập trung vào trải nghiệm người dùng và hiệu năng.",
    "subjects": [
      "Tin học",
      "Toán",
      "Mỹ thuật"
    ],
    "jobSkills": [
      "lập trình mobile",
      "UI cơ bản",
      "debug",
      "kiên trì",
      "tối ưu trải nghiệm"
    ],
    "majors": [
      "Kỹ thuật phần mềm",
      "Công nghệ thông tin",
      "Khoa học máy tính",
      "Thiết kế tương tác"
    ],
    "activities": [
      "Làm app ghi chú đơn giản",
      "Thiết kế màn hình app trên Figma",
      "Thử Flutter hoặc React Native tutorial"
    ]
  },
  {
    "title": "Cloud/DevOps Engineer",
    "cluster": "Engineering",
    "summary": "Triển khai, vận hành và tự động hóa hệ thống phần mềm trên cloud để sản phẩm chạy ổn định.",
    "subjects": [
      "Tin học",
      "Toán",
      "Tiếng Anh"
    ],
    "jobSkills": [
      "Linux",
      "Docker",
      "cloud",
      "tự động hóa",
      "xử lý sự cố"
    ],
    "majors": [
      "Công nghệ thông tin",
      "Mạng máy tính",
      "Khoa học máy tính",
      "Kỹ thuật phần mềm"
    ],
    "activities": [
      "Deploy một web app nhỏ lên cloud",
      "Chạy Docker container đầu tiên",
      "Viết checklist monitoring cơ bản"
    ]
  },
  {
    "title": "Cybersecurity Analyst",
    "cluster": "Engineering",
    "summary": "Giám sát, phát hiện và xử lý rủi ro bảo mật để bảo vệ hệ thống và dữ liệu.",
    "subjects": [
      "Tin học",
      "Toán",
      "Giáo dục công dân"
    ],
    "jobSkills": [
      "tư duy hệ thống",
      "bảo mật",
      "phân tích rủi ro",
      "cẩn thận",
      "đạo đức nghề nghiệp"
    ],
    "majors": [
      "An toàn thông tin",
      "Mạng máy tính",
      "Công nghệ thông tin",
      "Khoa học máy tính"
    ],
    "activities": [
      "Tìm hiểu OWASP Top 10",
      "Kiểm tra mật khẩu mạnh/yếu",
      "Viết hướng dẫn bảo mật tài khoản cho học sinh"
    ]
  },
  {
    "title": "Kỹ sư IoT/Embedded",
    "cluster": "Engineering",
    "summary": "Lập trình thiết bị, cảm biến và hệ thống nhúng để kết nối thế giới vật lý với phần mềm.",
    "subjects": [
      "Vật lý",
      "Tin học",
      "Toán"
    ],
    "jobSkills": [
      "lập trình",
      "điện tử cơ bản",
      "giải quyết vấn đề",
      "thử nghiệm",
      "kiên trì"
    ],
    "majors": [
      "Kỹ thuật máy tính",
      "Điện tử viễn thông",
      "Tự động hóa",
      "Công nghệ thông tin"
    ],
    "activities": [
      "Làm mạch Arduino đo nhiệt độ",
      "Tìm hiểu cảm biến và vi điều khiển",
      "Lập trình thiết bị bật/tắt đèn đơn giản"
    ]
  },
  {
    "title": "Thiết kế sản phẩm số cho giáo dục",
    "cluster": "Product & Design",
    "summary": "Thiết kế trải nghiệm học tập, app học tập và công cụ hỗ trợ học sinh dựa trên nhu cầu thực tế.",
    "subjects": [
      "Mỹ thuật",
      "Tin học",
      "Ngữ văn"
    ],
    "jobSkills": [
      "thiết kế",
      "đồng cảm",
      "nghiên cứu người dùng",
      "thuyết trình"
    ],
    "majors": [
      "Thiết kế tương tác",
      "Công nghệ giáo dục",
      "Truyền thông đa phương tiện",
      "Thiết kế đồ họa"
    ],
    "activities": [
      "Vẽ wireframe app học tập",
      "Quan sát một buổi học và ghi insight",
      "Test giao diện với 3 bạn cùng lớp"
    ]
  },
  {
    "title": "UX/UI Designer",
    "cluster": "Product & Design",
    "summary": "Thiết kế giao diện và trải nghiệm để sản phẩm số dễ dùng, rõ ràng và phù hợp nhu cầu người dùng.",
    "subjects": [
      "Mỹ thuật",
      "Tin học",
      "Ngữ văn"
    ],
    "jobSkills": [
      "thiết kế giao diện",
      "nghiên cứu người dùng",
      "Figma",
      "đồng cảm",
      "thẩm mỹ"
    ],
    "majors": [
      "Thiết kế đồ họa",
      "Thiết kế tương tác",
      "Truyền thông đa phương tiện",
      "Công nghệ thông tin"
    ],
    "activities": [
      "Thiết kế lại màn hình đăng nhập của một app",
      "Phỏng vấn 3 bạn về trải nghiệm dùng app học tập",
      "Tạo prototype đơn giản trên Figma"
    ]
  },
  {
    "title": "Product Manager",
    "cluster": "Product & Design",
    "summary": "Xác định vấn đề người dùng, ưu tiên tính năng và phối hợp đội kỹ thuật, thiết kế, kinh doanh để phát triển sản phẩm.",
    "subjects": [
      "Tin học",
      "Ngữ văn",
      "Kinh tế"
    ],
    "jobSkills": [
      "giao tiếp",
      "tư duy sản phẩm",
      "phân tích vấn đề",
      "ưu tiên",
      "làm việc nhóm"
    ],
    "majors": [
      "Quản trị kinh doanh",
      "Hệ thống thông tin",
      "Kinh doanh số",
      "Công nghệ thông tin"
    ],
    "activities": [
      "Viết PRD cho một tính năng nhỏ",
      "Phân tích ưu nhược điểm của một app quen thuộc",
      "Tạo kế hoạch 4 tuần cho sản phẩm giả lập"
    ]
  },
  {
    "title": "Game Designer",
    "cluster": "Product & Design",
    "summary": "Thiết kế luật chơi, màn chơi, trải nghiệm và cơ chế tương tác để tạo ra trò chơi hấp dẫn.",
    "subjects": [
      "Mỹ thuật",
      "Tin học",
      "Ngữ văn"
    ],
    "jobSkills": [
      "sáng tạo",
      "kể chuyện",
      "thiết kế hệ thống",
      "kiểm thử",
      "cân bằng trò chơi"
    ],
    "majors": [
      "Thiết kế game",
      "Công nghệ thông tin",
      "Truyền thông đa phương tiện",
      "Thiết kế đồ họa"
    ],
    "activities": [
      "Viết concept cho một game giáo dục",
      "Thiết kế 3 màn chơi trên giấy",
      "Test luật chơi với bạn bè và ghi feedback"
    ]
  },
  {
    "title": "Thiết kế đồ họa/Multimedia Designer",
    "cluster": "Product & Design",
    "summary": "Tạo hình ảnh, video, ấn phẩm và nội dung trực quan cho truyền thông, giáo dục hoặc sản phẩm số.",
    "subjects": [
      "Mỹ thuật",
      "Tin học",
      "Ngữ văn"
    ],
    "jobSkills": [
      "sáng tạo",
      "bố cục",
      "màu sắc",
      "thiết kế số",
      "kể chuyện hình ảnh"
    ],
    "majors": [
      "Thiết kế đồ họa",
      "Truyền thông đa phương tiện",
      "Mỹ thuật ứng dụng",
      "Thiết kế số"
    ],
    "activities": [
      "Thiết kế poster giới thiệu một ngành học",
      "Làm video ngắn giải thích một nghề",
      "Thử thiết kế bộ icon cho app học tập"
    ]
  },
  {
    "title": "Instructional Designer",
    "cluster": "Product & Design",
    "summary": "Thiết kế nội dung học tập, khóa học và hoạt động giúp người học tiếp thu hiệu quả hơn.",
    "subjects": [
      "Ngữ văn",
      "Tin học",
      "Tâm lý học"
    ],
    "jobSkills": [
      "thiết kế học tập",
      "viết nội dung",
      "đồng cảm",
      "cấu trúc bài học",
      "đánh giá hiệu quả"
    ],
    "majors": [
      "Công nghệ giáo dục",
      "Sư phạm",
      "Tâm lý học giáo dục",
      "Truyền thông đa phương tiện"
    ],
    "activities": [
      "Thiết kế một bài học 10 phút",
      "Biến một bài lý thuyết thành infographic",
      "Tạo quiz kiểm tra kiến thức sau bài học"
    ]
  },
  {
    "title": "Marketing nội dung giáo dục",
    "cluster": "Business & Communication",
    "summary": "Tạo nội dung, chiến dịch truyền thông và sản phẩm giúp học sinh tiếp cận tri thức dễ hiểu hơn.",
    "subjects": [
      "Ngữ văn",
      "Tiếng Anh",
      "Tin học"
    ],
    "jobSkills": [
      "viết",
      "sáng tạo",
      "kể chuyện",
      "phân tích hành vi"
    ],
    "majors": [
      "Marketing",
      "Truyền thông đa phương tiện",
      "Quan hệ công chúng",
      "Công nghệ giáo dục"
    ],
    "activities": [
      "Làm video giải thích một nghề",
      "Viết bài review ngành học",
      "Phân tích kênh truyền thông của một trường đại học"
    ]
  },
  {
    "title": "Digital Marketing Specialist",
    "cluster": "Business & Communication",
    "summary": "Lập kế hoạch và triển khai hoạt động marketing trên các nền tảng số để tiếp cận đúng nhóm người dùng.",
    "subjects": [
      "Ngữ văn",
      "Tiếng Anh",
      "Kinh tế"
    ],
    "jobSkills": [
      "viết nội dung",
      "phân tích số liệu",
      "sáng tạo",
      "hiểu khách hàng",
      "lập kế hoạch"
    ],
    "majors": [
      "Marketing",
      "Kinh doanh số",
      "Truyền thông",
      "Quản trị kinh doanh"
    ],
    "activities": [
      "Lên kế hoạch truyền thông cho CLB trường",
      "Phân tích một chiến dịch quảng cáo",
      "Viết 5 caption cho một sản phẩm giáo dục"
    ]
  },
  {
    "title": "Business Analyst",
    "cluster": "Business & Communication",
    "summary": "Làm cầu nối giữa người dùng, kinh doanh và kỹ thuật để mô tả yêu cầu, quy trình và giải pháp sản phẩm.",
    "subjects": [
      "Toán",
      "Tin học",
      "Ngữ văn"
    ],
    "jobSkills": [
      "phân tích yêu cầu",
      "giao tiếp",
      "vẽ quy trình",
      "logic",
      "viết tài liệu"
    ],
    "majors": [
      "Hệ thống thông tin quản lý",
      "Quản trị kinh doanh",
      "Công nghệ thông tin",
      "Kinh doanh số"
    ],
    "activities": [
      "Vẽ flow đăng ký tài khoản cho một app",
      "Viết user story cho tính năng chat",
      "Phỏng vấn bạn học về một vấn đề trong lớp"
    ]
  },
  {
    "title": "Chuyên viên Nhân sự/Talent Acquisition",
    "cluster": "Business & Communication",
    "summary": "Tuyển dụng, phát triển con người và xây dựng môi trường làm việc phù hợp cho tổ chức.",
    "subjects": [
      "Ngữ văn",
      "Giáo dục công dân",
      "Tiếng Anh"
    ],
    "jobSkills": [
      "giao tiếp",
      "lắng nghe",
      "đánh giá con người",
      "tổ chức",
      "đạo đức nghề nghiệp"
    ],
    "majors": [
      "Quản trị nhân lực",
      "Tâm lý học",
      "Quản trị kinh doanh",
      "Quan hệ lao động"
    ],
    "activities": [
      "Mô phỏng phỏng vấn tuyển thành viên CLB",
      "Viết mô tả công việc cho một vai trò",
      "Tìm hiểu cách xây dựng văn hóa đội nhóm"
    ]
  },
  {
    "title": "E-commerce Operations Specialist",
    "cluster": "Business & Communication",
    "summary": "Quản lý vận hành gian hàng online, sản phẩm, đơn hàng, dữ liệu bán hàng và trải nghiệm khách hàng.",
    "subjects": [
      "Kinh tế",
      "Tin học",
      "Toán"
    ],
    "jobSkills": [
      "quản lý vận hành",
      "Excel",
      "phân tích dữ liệu",
      "chăm sóc khách hàng",
      "tối ưu quy trình"
    ],
    "majors": [
      "Thương mại điện tử",
      "Kinh doanh số",
      "Quản trị kinh doanh",
      "Logistics"
    ],
    "activities": [
      "Phân tích gian hàng online yêu thích",
      "Tạo bảng theo dõi đơn hàng mẫu",
      "Đề xuất 3 cách cải thiện trải nghiệm mua hàng"
    ]
  },
  {
    "title": "Tư vấn tâm lý học đường",
    "cluster": "Human & Social",
    "summary": "Lắng nghe, hỗ trợ học sinh hiểu bản thân, quản lý cảm xúc và ra quyết định học tập lành mạnh.",
    "subjects": [
      "Ngữ văn",
      "Sinh học",
      "Giáo dục công dân"
    ],
    "jobSkills": [
      "lắng nghe",
      "giao tiếp",
      "đồng cảm",
      "đạo đức nghề nghiệp"
    ],
    "majors": [
      "Tâm lý học",
      "Tâm lý học giáo dục",
      "Công tác xã hội",
      "Sư phạm"
    ],
    "activities": [
      "Viết nhật ký phản tư",
      "Tìm hiểu kỹ năng lắng nghe chủ động",
      "Tham gia hoạt động hỗ trợ bạn học"
    ]
  },
  {
    "title": "Giáo viên/Chuyên viên giáo dục",
    "cluster": "Human & Social",
    "summary": "Thiết kế hoạt động học tập, giảng dạy và hỗ trợ học sinh phát triển kiến thức, kỹ năng, thái độ.",
    "subjects": [
      "Ngữ văn",
      "Toán",
      "Giáo dục công dân"
    ],
    "jobSkills": [
      "truyền đạt",
      "kiên nhẫn",
      "tổ chức lớp học",
      "đồng cảm",
      "đánh giá học tập"
    ],
    "majors": [
      "Sư phạm",
      "Quản lý giáo dục",
      "Tâm lý học giáo dục",
      "Công nghệ giáo dục"
    ],
    "activities": [
      "Dạy thử một chủ đề cho bạn học",
      "Thiết kế mini lesson 15 phút",
      "Quan sát một tiết học và ghi lại phương pháp dạy"
    ]
  },
  {
    "title": "Nhà báo/Content Writer",
    "cluster": "Human & Social",
    "summary": "Tìm hiểu thông tin, phỏng vấn, viết bài và kể câu chuyện giúp công chúng hiểu vấn đề xã hội hoặc chuyên môn.",
    "subjects": [
      "Ngữ văn",
      "Lịch sử",
      "Tiếng Anh"
    ],
    "jobSkills": [
      "viết",
      "phỏng vấn",
      "nghiên cứu",
      "tư duy phản biện",
      "kể chuyện"
    ],
    "majors": [
      "Báo chí",
      "Truyền thông",
      "Quan hệ công chúng",
      "Ngôn ngữ học"
    ],
    "activities": [
      "Viết bài phỏng vấn một anh/chị sinh viên",
      "Tóm tắt một vấn đề xã hội bằng 500 chữ",
      "Làm newsletter lớp học"
    ]
  },
  {
    "title": "Luật sư/Chuyên viên pháp lý",
    "cluster": "Human & Social",
    "summary": "Nghiên cứu quy định, tư vấn pháp luật và hỗ trợ cá nhân/tổ chức xử lý vấn đề pháp lý.",
    "subjects": [
      "Giáo dục công dân",
      "Ngữ văn",
      "Lịch sử"
    ],
    "jobSkills": [
      "đọc hiểu văn bản",
      "lập luận",
      "giao tiếp",
      "đạo đức nghề nghiệp",
      "tư duy phản biện"
    ],
    "majors": [
      "Luật",
      "Luật kinh tế",
      "Quan hệ quốc tế",
      "Quản lý nhà nước"
    ],
    "activities": [
      "Phân tích một tình huống pháp luật học đường",
      "Tham gia debate về quyền và trách nhiệm",
      "Tóm tắt một văn bản luật đơn giản"
    ]
  },
  {
    "title": "Công tác xã hội",
    "cluster": "Human & Social",
    "summary": "Hỗ trợ cá nhân, nhóm hoặc cộng đồng giải quyết khó khăn và tiếp cận nguồn lực xã hội phù hợp.",
    "subjects": [
      "Giáo dục công dân",
      "Ngữ văn",
      "Sinh học"
    ],
    "jobSkills": [
      "đồng cảm",
      "lắng nghe",
      "tổ chức hoạt động",
      "giao tiếp",
      "kiên nhẫn"
    ],
    "majors": [
      "Công tác xã hội",
      "Xã hội học",
      "Tâm lý học",
      "Phát triển cộng đồng"
    ],
    "activities": [
      "Tham gia hoạt động tình nguyện",
      "Lập kế hoạch hỗ trợ một nhóm học sinh mới",
      "Tìm hiểu vai trò của công tác xã hội trong trường học"
    ]
  },
  {
    "title": "Bác sĩ",
    "cluster": "Health & Life Sciences",
    "summary": "Khám, chẩn đoán, điều trị và tư vấn sức khỏe cho người bệnh với trách nhiệm chuyên môn cao.",
    "subjects": [
      "Sinh học",
      "Hóa học",
      "Toán"
    ],
    "jobSkills": [
      "học tập bền bỉ",
      "đồng cảm",
      "quan sát",
      "ra quyết định",
      "đạo đức nghề nghiệp"
    ],
    "majors": [
      "Y khoa",
      "Y học dự phòng",
      "Răng hàm mặt",
      "Y học cổ truyền"
    ],
    "activities": [
      "Tìm hiểu một ngày làm việc của bác sĩ",
      "Học sơ cứu cơ bản",
      "Đọc tài liệu phổ thông về sức khỏe cộng đồng"
    ]
  },
  {
    "title": "Dược sĩ",
    "cluster": "Health & Life Sciences",
    "summary": "Nghiên cứu, tư vấn và quản lý thuốc nhằm hỗ trợ điều trị an toàn và hiệu quả.",
    "subjects": [
      "Hóa học",
      "Sinh học",
      "Toán"
    ],
    "jobSkills": [
      "cẩn thận",
      "kiến thức hóa sinh",
      "tư vấn",
      "đọc hiểu tài liệu",
      "trách nhiệm"
    ],
    "majors": [
      "Dược học",
      "Hóa dược",
      "Công nghệ sinh học",
      "Y tế công cộng"
    ],
    "activities": [
      "Tìm hiểu cách đọc nhãn thuốc an toàn",
      "Làm infographic về sử dụng thuốc đúng cách",
      "Phỏng vấn người làm trong ngành dược nếu có cơ hội"
    ]
  },
  {
    "title": "Chuyên viên Y tế công cộng",
    "cluster": "Health & Life Sciences",
    "summary": "Nghiên cứu, truyền thông và triển khai chương trình nâng cao sức khỏe cho cộng đồng.",
    "subjects": [
      "Sinh học",
      "Giáo dục công dân",
      "Toán"
    ],
    "jobSkills": [
      "phân tích dữ liệu",
      "truyền thông sức khỏe",
      "nghiên cứu",
      "đồng cảm",
      "lập kế hoạch"
    ],
    "majors": [
      "Y tế công cộng",
      "Y học dự phòng",
      "Dinh dưỡng",
      "Công tác xã hội"
    ],
    "activities": [
      "Thiết kế poster phòng bệnh",
      "Khảo sát thói quen sức khỏe của lớp",
      "Phân tích số liệu sức khỏe giả lập"
    ]
  },
  {
    "title": "Kỹ sư Công nghệ sinh học",
    "cluster": "Health & Life Sciences",
    "summary": "Ứng dụng sinh học, hóa học và công nghệ để phát triển sản phẩm trong y dược, nông nghiệp hoặc môi trường.",
    "subjects": [
      "Sinh học",
      "Hóa học",
      "Toán"
    ],
    "jobSkills": [
      "nghiên cứu",
      "thí nghiệm",
      "phân tích",
      "cẩn thận",
      "đọc tài liệu"
    ],
    "majors": [
      "Công nghệ sinh học",
      "Sinh học ứng dụng",
      "Kỹ thuật sinh học",
      "Công nghệ thực phẩm"
    ],
    "activities": [
      "Tìm hiểu ứng dụng enzyme trong đời sống",
      "Làm báo cáo về công nghệ sinh học xanh",
      "Quan sát thí nghiệm sinh học an toàn ở trường"
    ]
  },
  {
    "title": "Chuyên viên Dinh dưỡng",
    "cluster": "Health & Life Sciences",
    "summary": "Tư vấn chế độ ăn và lối sống dựa trên kiến thức khoa học về dinh dưỡng và sức khỏe.",
    "subjects": [
      "Sinh học",
      "Hóa học",
      "Giáo dục thể chất"
    ],
    "jobSkills": [
      "tư vấn",
      "phân tích thói quen",
      "giao tiếp",
      "khoa học sức khỏe",
      "đồng cảm"
    ],
    "majors": [
      "Dinh dưỡng",
      "Y tế công cộng",
      "Khoa học thực phẩm",
      "Điều dưỡng"
    ],
    "activities": [
      "Ghi nhật ký ăn uống 3 ngày",
      "Tìm hiểu nguyên tắc bữa ăn cân bằng",
      "Làm poster về dinh dưỡng học đường"
    ]
  },
  {
    "title": "Kỹ sư Môi trường",
    "cluster": "Science & Environment",
    "summary": "Phân tích và thiết kế giải pháp xử lý vấn đề môi trường như nước thải, rác thải, ô nhiễm không khí.",
    "subjects": [
      "Hóa học",
      "Sinh học",
      "Địa lý"
    ],
    "jobSkills": [
      "phân tích hệ thống",
      "nghiên cứu",
      "giải quyết vấn đề",
      "làm việc thực địa",
      "trách nhiệm xã hội"
    ],
    "majors": [
      "Kỹ thuật môi trường",
      "Khoa học môi trường",
      "Quản lý tài nguyên môi trường",
      "Công nghệ kỹ thuật môi trường"
    ],
    "activities": [
      "Khảo sát rác thải trong lớp học",
      "Đề xuất kế hoạch giảm nhựa dùng một lần",
      "Tìm hiểu quy trình xử lý nước thải"
    ]
  },
  {
    "title": "Nhà nghiên cứu Khoa học vật liệu",
    "cluster": "Science & Environment",
    "summary": "Nghiên cứu vật liệu mới phục vụ công nghệ, y tế, xây dựng, năng lượng hoặc sản xuất.",
    "subjects": [
      "Vật lý",
      "Hóa học",
      "Toán"
    ],
    "jobSkills": [
      "nghiên cứu",
      "thí nghiệm",
      "tư duy logic",
      "kiên trì",
      "đọc tài liệu"
    ],
    "majors": [
      "Khoa học vật liệu",
      "Kỹ thuật vật liệu",
      "Vật lý kỹ thuật",
      "Hóa học"
    ],
    "activities": [
      "Tìm hiểu vật liệu tái chế",
      "Làm poster về pin và vật liệu năng lượng",
      "Quan sát tính chất vật liệu trong đời sống"
    ]
  },
  {
    "title": "Kỹ sư Năng lượng tái tạo",
    "cluster": "Science & Environment",
    "summary": "Thiết kế, vận hành hoặc phân tích hệ thống năng lượng mặt trời, gió và các giải pháp tiết kiệm năng lượng.",
    "subjects": [
      "Vật lý",
      "Toán",
      "Địa lý"
    ],
    "jobSkills": [
      "tư duy kỹ thuật",
      "phân tích số liệu",
      "mô hình hóa",
      "giải quyết vấn đề",
      "trách nhiệm môi trường"
    ],
    "majors": [
      "Kỹ thuật năng lượng",
      "Năng lượng tái tạo",
      "Kỹ thuật điện",
      "Kỹ thuật môi trường"
    ],
    "activities": [
      "Tính công suất điện mặt trời giả lập",
      "Tìm hiểu mô hình turbine gió",
      "Đánh giá cách tiết kiệm điện trong gia đình"
    ]
  },
  {
    "title": "Kiến trúc sư",
    "cluster": "Creative & Architecture",
    "summary": "Thiết kế không gian sống, học tập và làm việc kết hợp thẩm mỹ, công năng và kỹ thuật.",
    "subjects": [
      "Mỹ thuật",
      "Toán",
      "Vật lý"
    ],
    "jobSkills": [
      "vẽ",
      "tư duy không gian",
      "sáng tạo",
      "kỹ thuật",
      "thuyết trình"
    ],
    "majors": [
      "Kiến trúc",
      "Quy hoạch vùng và đô thị",
      "Thiết kế nội thất",
      "Mỹ thuật ứng dụng"
    ],
    "activities": [
      "Phác thảo lại phòng học lý tưởng",
      "Tìm hiểu bản vẽ mặt bằng",
      "Dựng mô hình giấy một không gian nhỏ"
    ]
  },
  {
    "title": "Thiết kế Nội thất",
    "cluster": "Creative & Architecture",
    "summary": "Thiết kế cách bố trí, màu sắc, ánh sáng và vật liệu để tạo không gian đẹp, tiện nghi và phù hợp người dùng.",
    "subjects": [
      "Mỹ thuật",
      "Toán",
      "Tin học"
    ],
    "jobSkills": [
      "thẩm mỹ",
      "tư duy không gian",
      "thiết kế",
      "lắng nghe nhu cầu",
      "trình bày ý tưởng"
    ],
    "majors": [
      "Thiết kế nội thất",
      "Kiến trúc",
      "Mỹ thuật ứng dụng",
      "Thiết kế đồ họa"
    ],
    "activities": [
      "Moodboard cho góc học tập",
      "Thiết kế lại bố cục phòng ngủ",
      "Tìm hiểu phần mềm dựng không gian cơ bản"
    ]
  },
  {
    "title": "Đạo diễn/Video Producer",
    "cluster": "Creative & Architecture",
    "summary": "Lên ý tưởng, quay dựng và sản xuất video để kể chuyện, truyền thông hoặc giáo dục.",
    "subjects": [
      "Ngữ văn",
      "Mỹ thuật",
      "Tin học"
    ],
    "jobSkills": [
      "kể chuyện",
      "quay dựng",
      "sáng tạo",
      "làm việc nhóm",
      "quản lý dự án"
    ],
    "majors": [
      "Truyền thông đa phương tiện",
      "Đạo diễn điện ảnh",
      "Báo chí",
      "Thiết kế đồ họa"
    ],
    "activities": [
      "Làm video 1 phút giới thiệu một nghề",
      "Viết storyboard cho một clip học tập",
      "Thử dựng video bằng công cụ miễn phí"
    ]
  },
  {
    "title": "Kỹ sư Cơ khí",
    "cluster": "Engineering",
    "summary": "Thiết kế, chế tạo và cải tiến máy móc, thiết bị hoặc hệ thống sản xuất.",
    "subjects": [
      "Vật lý",
      "Toán",
      "Công nghệ"
    ],
    "jobSkills": [
      "tư duy kỹ thuật",
      "vẽ kỹ thuật",
      "giải quyết vấn đề",
      "thử nghiệm",
      "chính xác"
    ],
    "majors": [
      "Kỹ thuật cơ khí",
      "Cơ điện tử",
      "Kỹ thuật ô tô",
      "Tự động hóa"
    ],
    "activities": [
      "Tháo lắp và quan sát cơ chế của một vật dụng an toàn",
      "Tìm hiểu bản vẽ kỹ thuật",
      "Làm mô hình truyền động đơn giản"
    ]
  },
  {
    "title": "Kỹ sư Xây dựng",
    "cluster": "Engineering",
    "summary": "Thiết kế, giám sát và quản lý công trình như nhà ở, cầu đường, hạ tầng kỹ thuật.",
    "subjects": [
      "Toán",
      "Vật lý",
      "Công nghệ"
    ],
    "jobSkills": [
      "tính toán",
      "quản lý dự án",
      "tư duy không gian",
      "trách nhiệm",
      "làm việc nhóm"
    ],
    "majors": [
      "Kỹ thuật xây dựng",
      "Quản lý xây dựng",
      "Kỹ thuật hạ tầng",
      "Kiến trúc"
    ],
    "activities": [
      "Tìm hiểu kết cấu của một cây cầu",
      "Làm mô hình cầu bằng giấy",
      "Quan sát công trình và ghi lại các vai trò liên quan"
    ]
  },
  {
    "title": "Tài chính/Kế toán",
    "cluster": "Business & Communication",
    "summary": "Theo dõi, phân tích và quản lý dòng tiền, báo cáo tài chính hoặc kế hoạch tài chính của tổ chức.",
    "subjects": [
      "Toán",
      "Kinh tế",
      "Tin học"
    ],
    "jobSkills": [
      "cẩn thận",
      "Excel",
      "tư duy số liệu",
      "quy định tài chính",
      "trách nhiệm"
    ],
    "majors": [
      "Kế toán",
      "Tài chính ngân hàng",
      "Kiểm toán",
      "Quản trị kinh doanh"
    ],
    "activities": [
      "Lập bảng thu chi cá nhân",
      "Tìm hiểu báo cáo tài chính đơn giản",
      "So sánh kế hoạch tiết kiệm theo từng tháng"
    ]
  },
  {
    "title": "Logistics/Supply Chain Specialist",
    "cluster": "Business & Communication",
    "summary": "Quản lý dòng hàng hóa, kho, vận chuyển và quy trình để sản phẩm đến đúng nơi, đúng thời điểm, đúng chi phí.",
    "subjects": [
      "Toán",
      "Địa lý",
      "Kinh tế"
    ],
    "jobSkills": [
      "tối ưu quy trình",
      "phân tích dữ liệu",
      "quản lý thời gian",
      "giao tiếp",
      "giải quyết vấn đề"
    ],
    "majors": [
      "Logistics và quản lý chuỗi cung ứng",
      "Kinh doanh quốc tế",
      "Quản trị kinh doanh",
      "Thương mại điện tử"
    ],
    "activities": [
      "Mô phỏng đường đi của một đơn hàng online",
      "Tối ưu lịch giao hàng giả lập",
      "Vẽ sơ đồ chuỗi cung ứng của một sản phẩm"
    ]
  },
  {
    "title": "Quản trị Khách sạn/Du lịch",
    "cluster": "Service & Hospitality",
    "summary": "Tổ chức dịch vụ lưu trú, du lịch và trải nghiệm khách hàng trong môi trường dịch vụ chuyên nghiệp.",
    "subjects": [
      "Tiếng Anh",
      "Địa lý",
      "Ngữ văn"
    ],
    "jobSkills": [
      "giao tiếp",
      "dịch vụ khách hàng",
      "ngoại ngữ",
      "tổ chức",
      "xử lý tình huống"
    ],
    "majors": [
      "Quản trị khách sạn",
      "Quản trị du lịch và lữ hành",
      "Quản trị dịch vụ du lịch",
      "Ngôn ngữ Anh"
    ],
    "activities": [
      "Lên itinerary du lịch 1 ngày",
      "Mô phỏng xử lý phàn nàn của khách",
      "Tìm hiểu một vị trí trong khách sạn"
    ]
  },
  {
    "title": "Đầu bếp/Quản lý ẩm thực",
    "cluster": "Service & Hospitality",
    "summary": "Sáng tạo món ăn, quản lý bếp và đảm bảo chất lượng dịch vụ ẩm thực.",
    "subjects": [
      "Công nghệ",
      "Hóa học",
      "Giáo dục thể chất"
    ],
    "jobSkills": [
      "sáng tạo",
      "vệ sinh an toàn",
      "quản lý thời gian",
      "làm việc áp lực",
      "chú ý chi tiết"
    ],
    "majors": [
      "Kỹ thuật chế biến món ăn",
      "Quản trị nhà hàng",
      "Công nghệ thực phẩm",
      "Dinh dưỡng"
    ],
    "activities": [
      "Thiết kế thực đơn lành mạnh cho học sinh",
      "Tìm hiểu quy trình an toàn thực phẩm",
      "Nấu thử một món và ghi lại quy trình cải tiến"
    ]
  },
  {
    "title": "Biên phiên dịch",
    "cluster": "Language & Culture",
    "summary": "Chuyển đổi thông tin giữa các ngôn ngữ, hỗ trợ giao tiếp trong học thuật, kinh doanh, truyền thông hoặc văn hóa.",
    "subjects": [
      "Tiếng Anh",
      "Ngữ văn",
      "Lịch sử"
    ],
    "jobSkills": [
      "ngoại ngữ",
      "diễn đạt",
      "nghe hiểu",
      "tập trung",
      "hiểu văn hóa"
    ],
    "majors": [
      "Ngôn ngữ Anh",
      "Ngôn ngữ Nhật",
      "Ngôn ngữ Hàn",
      "Biên phiên dịch"
    ],
    "activities": [
      "Dịch một đoạn video ngắn",
      "Tóm tắt bài báo tiếng Anh",
      "Luyện shadowing 10 phút mỗi ngày"
    ]
  },
  {
    "title": "Quan hệ quốc tế",
    "cluster": "Language & Culture",
    "summary": "Nghiên cứu quan hệ giữa các quốc gia, tổ chức quốc tế và các vấn đề toàn cầu.",
    "subjects": [
      "Lịch sử",
      "Địa lý",
      "Tiếng Anh"
    ],
    "jobSkills": [
      "nghiên cứu",
      "ngoại ngữ",
      "tư duy phản biện",
      "giao tiếp",
      "hiểu văn hóa"
    ],
    "majors": [
      "Quan hệ quốc tế",
      "Quốc tế học",
      "Ngôn ngữ Anh",
      "Luật quốc tế"
    ],
    "activities": [
      "Theo dõi một tin quốc tế và tóm tắt trung lập",
      "Tham gia mô phỏng MUN",
      "Tìm hiểu vai trò của một tổ chức quốc tế"
    ]
  }
];

const clusterDefaults = {
  "AI & Data": {
    jobTasks: ["Làm sạch dữ liệu", "Phân tích mẫu", "Tạo dashboard", "Trình bày insight"]
  },
  Engineering: {
    jobTasks: ["Thiết kế giải pháp", "Xây prototype", "Kiểm thử", "Cải tiến hệ thống"]
  },
  "Product & Design": {
    jobTasks: ["Nghiên cứu người dùng", "Vẽ flow", "Tạo prototype", "Test và cải tiến"]
  },
  "Business & Communication": {
    jobTasks: ["Phân tích nhu cầu", "Lập kế hoạch", "Giao tiếp với stakeholder", "Đo hiệu quả"]
  },
  "Health & Life Sciences": {
    jobTasks: ["Tìm hiểu ca thực tế", "Đọc tài liệu chuyên môn", "Thực hành quy trình", "Ghi nhận kết quả"]
  },
  "Human & Social": {
    jobTasks: ["Lắng nghe", "Đặt câu hỏi", "Phân tích bối cảnh", "Kết nối nguồn lực hỗ trợ"]
  },
  "Science & Environment": {
    jobTasks: ["Quan sát hiện tượng", "Thu thập dữ liệu", "Thử nghiệm nhỏ", "Viết nhận định"]
  },
  "Creative & Architecture": {
    jobTasks: ["Lên ý tưởng", "Phác thảo", "Dựng sản phẩm mẫu", "Nhận feedback"]
  },
  "Service & Hospitality": {
    jobTasks: ["Tiếp nhận nhu cầu", "Tổ chức quy trình", "Xử lý tình huống", "Cải thiện trải nghiệm"]
  },
  "Language & Culture": {
    jobTasks: ["Đọc và tóm tắt", "Dịch/chuyển ngữ", "Tra cứu bối cảnh", "Trình bày quan điểm"]
  },
  default: {
    jobTasks: ["Tìm hiểu vai trò", "Thực hành nhiệm vụ nhỏ", "Xin feedback", "Cải tiến sản phẩm"]
  }
};

function enrichCareer(career) {
  const defaults = clusterDefaults[career.cluster] ?? clusterDefaults.default;

  return {
    ...career,
    jobTasks: career.jobTasks ?? defaults.jobTasks
  };
}

const demoAssessmentAnswers = {
  q_quant_numbers: 5,
  q_quant_models: 5,
  q_verbal_explain: 4,
  q_verbal_write: 4,
  q_science_experiment: 4,
  q_science_evidence: 5,
  q_tech_tools: 5,
  q_tech_automation: 5,
  q_r_hands_on: 4,
  q_r_tools_build: 4,
  q_i_research: 5,
  q_i_patterns: 5,
  q_a_visual_expression: 4,
  q_a_original_ideas: 4,
  q_s_support: 4,
  q_s_teach: 4,
  q_e_persuade: 3,
  q_e_initiate: 4,
  q_c_structure: 4,
  q_c_detail: 4,
  q_analytical_breakdown: 5,
  q_analytical_compare: 5,
  q_collab_team: 4,
  q_collab_feedback: 4,
  q_independent_plan: 5,
  q_independent_deepwork: 5,
  q_leadership_coordinate: 4,
  q_leadership_decide: 3,
  q_creativity_many_ideas: 4,
  q_creativity_prototype: 4,
  q_social_empathy: 4,
  q_social_context: 4
};

async function upsertUser({ email, name, role, password, gradeLevel = null }) {
  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.upsert({
    where: { email },
    update: { name, role, status: UserStatus.ACTIVE, passwordHash, gradeLevel },
    create: { email, name, role, status: UserStatus.ACTIVE, passwordHash, gradeLevel }
  });
}

async function main() {
  const admin = await upsertUser({
    email: "admin@example.com",
    name: "Admin Demo",
    role: Role.ADMIN,
    password: "admin123"
  });

  const student = await upsertUser({
    email: "student@example.com",
    name: "Học sinh Demo",
    role: Role.STUDENT,
    password: "student123",
    gradeLevel: "11"
  });

  await prisma.careerProfile.upsert({
    where: { userId: student.id },
    update: {
      gradeLevel: "11",
      interests: ["công nghệ", "giáo dục", "thiết kế"],
      strengths: ["logic", "sáng tạo", "thuyết trình"],
      favoriteSubjects: ["Tin học", "Toán", "Tiếng Anh"],
      values: ["học hỏi", "tạo sản phẩm", "tác động xã hội"],
      riasec: ["Investigative", "Artistic", "Social"],
      goals: "Muốn hiểu ngành phù hợp trước khi chọn khối và trường đại học.",
      constraints: "Chưa muốn bị ép chọn một nghề duy nhất quá sớm.",
      assessmentCompleted: true,
      assessmentAnswers: demoAssessmentAnswers
    },
    create: {
      userId: student.id,
      gradeLevel: "11",
      interests: ["công nghệ", "giáo dục", "thiết kế"],
      strengths: ["logic", "sáng tạo", "thuyết trình"],
      favoriteSubjects: ["Tin học", "Toán", "Tiếng Anh"],
      values: ["học hỏi", "tạo sản phẩm", "tác động xã hội"],
      riasec: ["Investigative", "Artistic", "Social"],
      goals: "Muốn hiểu ngành phù hợp trước khi chọn khối và trường đại học.",
      constraints: "Chưa muốn bị ép chọn một nghề duy nhất quá sớm.",
      assessmentCompleted: true,
      assessmentAnswers: demoAssessmentAnswers
    }
  });

  const careerCatalog = careerPaths.map(enrichCareer);
  const careerTitles = careerCatalog.map((career) => career.title);

  for (const career of careerCatalog) {
    await prisma.careerPath.upsert({
      where: { title: career.title },
      update: career,
      create: career
    });
  }

  console.log(`Seeded ${careerCatalog.length} career paths and demo users.`);
  console.log(`Admin id: ${admin.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// const { PrismaClient, Role, UserStatus } = pkg;
// import bcrypt from "bcryptjs";

// const prisma = new PrismaClient();

from models.schemas import AssessmentQuestion, Weights


assessment_questions = [
    AssessmentQuestion(
        id="q_quant_numbers", step="subjects",
        prompt="Em thấy thoải mái khi làm việc với con số, tỉ lệ, bảng điểm hoặc số liệu thống kê.",
        weights=Weights(favoriteSubjects=["Toán"], strengths=["tư duy định lượng", "phân tích số liệu"], riasec=["Investigative", "Conventional"])
    ),
    AssessmentQuestion(
        id="q_quant_models", step="subjects",
        prompt="Em thích biến một tình huống thực tế thành công thức, biểu đồ hoặc mô hình để dễ so sánh.",
        weights=Weights(favoriteSubjects=["Toán", "Tin học"], strengths=["mô hình hóa", "tư duy logic"], interests=["dữ liệu"], riasec=["Investigative"])
    ),
    AssessmentQuestion(
        id="q_verbal_explain", step="subjects",
        prompt="Em thích giải thích ý tưởng bằng lời nói sao cho người khác dễ hiểu.",
        weights=Weights(favoriteSubjects=["Ngữ văn", "Tiếng Anh"], strengths=["giao tiếp", "thuyết trình"], riasec=["Social", "Artistic"])
    ),
    AssessmentQuestion(
        id="q_verbal_write", step="subjects",
        prompt="Em thích viết, tóm tắt hoặc sắp xếp thông tin thành bài trình bày rõ ràng.",
        weights=Weights(favoriteSubjects=["Ngữ văn", "Tiếng Anh"], strengths=["viết", "diễn đạt"], interests=["truyền thông"], riasec=["Artistic", "Social"])
    ),
    AssessmentQuestion(
        id="q_science_experiment", step="subjects",
        prompt="Em hứng thú với thí nghiệm, quan sát hiện tượng và kiểm tra giả thuyết.",
        weights=Weights(favoriteSubjects=["Vật lý", "Hóa học", "Sinh học"], strengths=["thử nghiệm", "tư duy khoa học"], riasec=["Investigative", "Realistic"])
    ),
    AssessmentQuestion(
        id="q_science_evidence", step="subjects",
        prompt="Khi nghe một kết luận, em muốn xem bằng chứng, dữ liệu hoặc cách kiểm chứng trước khi tin.",
        weights=Weights(favoriteSubjects=["Khoa học tự nhiên"], strengths=["tư duy phản biện", "phân tích"], values=["chính xác"], riasec=["Investigative"])
    ),
    AssessmentQuestion(
        id="q_tech_tools", step="subjects",
        prompt="Em thích dùng phần mềm, thiết bị số hoặc công cụ AI để học và làm việc hiệu quả hơn.",
        weights=Weights(favoriteSubjects=["Tin học"], interests=["công nghệ", "AI"], strengths=["công nghệ"], riasec=["Investigative", "Realistic"])
    ),
    AssessmentQuestion(
        id="q_tech_automation", step="subjects",
        prompt="Em muốn tự động hóa việc lặp lại bằng công cụ, code hoặc quy trình số.",
        weights=Weights(favoriteSubjects=["Tin học"], interests=["tự động hóa", "công nghệ"], strengths=["lập trình", "tư duy hệ thống"], riasec=["Realistic", "Investigative"])
    ),
    AssessmentQuestion(
        id="q_r_hands_on", step="interests",
        prompt="Em thích làm việc với vật thật, thiết bị, mô hình hoặc sản phẩm có thể chạm vào.",
        weights=Weights(interests=["thiết bị", "prototype"], strengths=["làm việc hiện trường"], values=["thực tế"], riasec=["Realistic"])
    ),
    AssessmentQuestion(
        id="q_r_tools_build", step="interests",
        prompt="Em hứng thú khi tự tay lắp ráp, sửa chữa, thử nghiệm hoặc cải tiến một thứ cụ thể.",
        weights=Weights(interests=["xây dựng sản phẩm", "thử nghiệm"], strengths=["kiên trì", "thực hành"], riasec=["Realistic"])
    ),
    AssessmentQuestion(
        id="q_i_research", step="interests",
        prompt="Em thích tự tìm hiểu sâu một chủ đề và đọc nhiều nguồn trước khi kết luận.",
        weights=Weights(interests=["nghiên cứu", "học hỏi sâu"], strengths=["đọc tài liệu", "tự học"], riasec=["Investigative"])
    ),
    AssessmentQuestion(
        id="q_i_patterns", step="interests",
        prompt="Em thích tìm quy luật, nguyên nhân hoặc mẫu ẩn sau một vấn đề.",
        weights=Weights(interests=["phân tích", "dữ liệu"], strengths=["tư duy logic", "phân tích"], riasec=["Investigative"])
    ),
    AssessmentQuestion(
        id="q_a_visual_expression", step="interests",
        prompt="Em thích thể hiện ý tưởng qua hình ảnh, bố cục, màu sắc, âm thanh hoặc câu chuyện.",
        weights=Weights(interests=["thiết kế", "sáng tạo", "kể chuyện"], strengths=["thiết kế"], riasec=["Artistic"])
    ),
    AssessmentQuestion(
        id="q_a_original_ideas", step="interests",
        prompt="Em thích những nhiệm vụ cho phép có nhiều cách làm và không chỉ có một đáp án đúng.",
        weights=Weights(interests=["sáng tạo", "thử nghiệm"], values=["tự do sáng tạo"], strengths=["sáng tạo"], riasec=["Artistic"])
    ),
    AssessmentQuestion(
        id="q_s_support", step="interests",
        prompt="Em có năng lượng khi lắng nghe, hỗ trợ hoặc giúp người khác vượt qua khó khăn.",
        weights=Weights(interests=["con người", "hỗ trợ bạn bè"], strengths=["lắng nghe", "đồng cảm"], values=["đồng cảm"], riasec=["Social"])
    ),
    AssessmentQuestion(
        id="q_s_teach", step="interests",
        prompt="Em thích hướng dẫn, kèm bạn học hoặc giúp người khác hiểu một điều mới.",
        weights=Weights(interests=["giáo dục", "giúp người khác học"], strengths=["giao tiếp", "kiên nhẫn"], values=["chia sẻ tri thức"], riasec=["Social"])
    ),
    AssessmentQuestion(
        id="q_e_persuade", step="skills",
        prompt="Em thấy hứng thú khi thuyết phục người khác ủng hộ một ý tưởng hoặc kế hoạch.",
        weights=Weights(interests=["kinh doanh", "truyền thông"], strengths=["thuyết trình", "giao tiếp"], values=["ảnh hưởng"], riasec=["Enterprising"])
    ),
    AssessmentQuestion(
        id="q_e_initiate", step="skills",
        prompt="Em hay chủ động bắt đầu dự án, rủ nhóm cùng làm hoặc biến ý tưởng thành hành động.",
        weights=Weights(interests=["sản phẩm", "khởi xướng"], strengths=["ưu tiên", "làm việc nhóm"], values=["tạo tác động"], riasec=["Enterprising"])
    ),
    AssessmentQuestion(
        id="q_c_structure", step="skills",
        prompt="Em thích công việc có quy trình, tiêu chuẩn và các bước rõ ràng.",
        weights=Weights(interests=["quy trình"], strengths=["tổ chức", "quản lý thời gian"], values=["rõ ràng", "kỷ luật"], riasec=["Conventional"])
    ),
    AssessmentQuestion(
        id="q_c_detail", step="skills",
        prompt="Em thường chú ý chi tiết, kiểm tra lỗi và muốn dữ liệu/tài liệu phải chính xác.",
        weights=Weights(strengths=["chú ý chi tiết", "Excel"], values=["chính xác", "trách nhiệm"], riasec=["Conventional"])
    ),
    AssessmentQuestion(
        id="q_analytical_breakdown", step="skills",
        prompt="Khi gặp vấn đề khó, em có xu hướng chia nhỏ nó thành từng phần để xử lý.",
        weights=Weights(strengths=["giải quyết vấn đề", "phân tích"], interests=["logic"], riasec=["Investigative"])
    ),
    AssessmentQuestion(
        id="q_analytical_compare", step="skills",
        prompt="Em thích so sánh nhiều phương án bằng tiêu chí rõ ràng trước khi chọn.",
        weights=Weights(strengths=["phân tích", "ra quyết định"], values=["hiệu quả"], riasec=["Investigative", "Conventional"])
    ),
    AssessmentQuestion(
        id="q_collab_team", step="skills",
        prompt="Em làm việc tốt khi cùng nhóm chia vai trò, trao đổi thường xuyên và hoàn thành mục tiêu chung.",
        weights=Weights(strengths=["làm việc nhóm", "giao tiếp"], values=["kết nối con người"], riasec=["Social", "Enterprising"])
    ),
    AssessmentQuestion(
        id="q_collab_feedback", step="skills",
        prompt="Em sẵn sàng nhận góp ý và điều chỉnh phần việc của mình để cả nhóm tốt hơn.",
        weights=Weights(strengths=["hợp tác", "lắng nghe"], values=["cải tiến"], riasec=["Social"])
    ),
    AssessmentQuestion(
        id="q_independent_plan", step="values",
        prompt="Em thích tự lập kế hoạch học/làm và chịu trách nhiệm với tiến độ của mình.",
        weights=Weights(strengths=["tự học", "quản lý thời gian"], values=["độc lập", "trách nhiệm"], riasec=["Investigative", "Conventional"])
    ),
    AssessmentQuestion(
        id="q_independent_deepwork", step="values",
        prompt="Em có thể tập trung làm việc một mình trong thời gian dài để hoàn thành việc quan trọng.",
        weights=Weights(strengths=["kiên trì", "tập trung"], values=["độc lập"], riasec=["Investigative"])
    ),
    AssessmentQuestion(
        id="q_leadership_coordinate", step="values",
        prompt="Em thích điều phối nhóm, phân chia việc và giúp mọi người cùng đi đúng hướng.",
        weights=Weights(strengths=["lãnh đạo", "ưu tiên", "giao tiếp"], values=["ảnh hưởng"], riasec=["Enterprising", "Social"])
    ),
    AssessmentQuestion(
        id="q_leadership_decide", step="values",
        prompt="Khi nhóm phân vân, em có thể đứng ra đề xuất quyết định và chịu trách nhiệm.",
        weights=Weights(strengths=["ra quyết định", "lãnh đạo"], values=["trách nhiệm"], riasec=["Enterprising"])
    ),
    AssessmentQuestion(
        id="q_creativity_many_ideas", step="values",
        prompt="Em thường nghĩ ra nhiều ý tưởng khác nhau cho cùng một vấn đề.",
        weights=Weights(interests=["sáng tạo"], strengths=["sáng tạo", "ý tưởng"], values=["tự do sáng tạo"], riasec=["Artistic"])
    ),
    AssessmentQuestion(
        id="q_creativity_prototype", step="values",
        prompt="Em thích thử cách làm mới, tạo bản nháp nhanh rồi cải tiến qua phản hồi.",
        weights=Weights(interests=["thử nghiệm", "xây dựng sản phẩm"], strengths=["sáng tạo", "prototype"], values=["cải tiến"], riasec=["Artistic", "Realistic"])
    ),
    AssessmentQuestion(
        id="q_social_empathy", step="values",
        prompt="Em dễ nhận ra cảm xúc, nhu cầu hoặc góc nhìn của người khác trong một tình huống.",
        weights=Weights(interests=["con người", "quan sát hành vi"], strengths=["đồng cảm", "lắng nghe"], values=["đồng cảm"], riasec=["Social"])
    ),
    AssessmentQuestion(
        id="q_social_context", step="values",
        prompt="Khi đánh giá một vấn đề, em thường cân nhắc bối cảnh gia đình, lớp học, cộng đồng hoặc văn hóa.",
        weights=Weights(interests=["cộng đồng", "xã hội"], strengths=["thấu hiểu xã hội"], values=["tác động xã hội"], riasec=["Social", "Investigative"])
    ),
]

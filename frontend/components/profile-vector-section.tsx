"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  HelpCircle,
  Info,
  Palette,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import type { CareerProfile } from "@/lib/types";

interface ProfileVectorSectionProps {
  profile: CareerProfile;
}

function TagList({
  values,
  empty,
  tone = "slate",
}: {
  values: string[];
  empty: string;
  tone?: "slate" | "teal" | "amber";
}) {
  if (values.length === 0) return <p className="m-0 text-sm text-slate-400">{empty}</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => {
        let chipClass = "chip-slate";
        if (tone === "teal") chipClass = "chip-teal";
        if (tone === "amber") chipClass = "chip-amber";
        return (
          <span className={chipClass} key={value}>
            {value}
          </span>
        );
      })}
    </div>
  );
}

// Helper to compute score and percentage from assessmentAnswers
function computeVectorScore(
  answers: Record<string, number> | undefined,
  questionIds: string[]
): { score: number; percentage: number } {
  if (!answers || !questionIds || questionIds.length === 0) {
    return { score: 3.0, percentage: 60 };
  }
  let sum = 0;
  let count = 0;
  for (const qId of questionIds) {
    const val = answers[qId];
    if (typeof val === "number" && !isNaN(val)) {
      sum += val;
      count++;
    }
  }
  const avg = count > 0 ? sum / count : 3.0;
  const clamped = Math.max(1.0, Math.min(5.0, avg));
  const percentage = Math.round((clamped / 5.0) * 100);
  return { score: Number(clamped.toFixed(1)), percentage };
}



// RIASEC Data Definition
const RIASEC_DATA = [
  {
    code: "R",
    name: "Realistic (Thực tế - Kỹ thuật)",
    shortName: "Thực tế",
    questions: ["q_r_hands_on", "q_r_tools_build"],
    color: "from-blue-600 to-indigo-600",
    bgLight: "bg-blue-50 text-blue-700 border-blue-200",
    barColor: "bg-gradient-to-t from-blue-600 to-indigo-400",
    icon: Wrench,
    keywords: ["Kỹ thuật", "Máy móc", "Xây dựng", "Hiện trường", "Thực hành"],
    desc: "Thích làm việc với công cụ, thiết bị, động thực vật, hoạt động ngoài trời, thực hành trực tiếp và tạo ra các sản phẩm hữu hình. Có thế mạnh về sự kiên trì, khéo léo và tư duy thực tiễn.",
  },
  {
    code: "I",
    name: "Investigative (Nghiên cứu - Tìm hiểu)",
    shortName: "Nghiên cứu",
    questions: ["q_i_research", "q_i_patterns"],
    color: "from-cyan-600 to-teal-600",
    bgLight: "bg-cyan-50 text-cyan-700 border-cyan-200",
    barColor: "bg-gradient-to-t from-cyan-600 to-teal-400",
    icon: Search,
    keywords: ["Khoa học", "Dữ liệu", "Phân tích", "Logic", "Thí nghiệm"],
    desc: "Thích quan sát, tìm hiểu sâu, phân tích dữ liệu, giải quyết các bài toán khoa học, toán học và logic. Có xu hướng tìm ra quy luật, nguyên nhân và mô hình ẩn sau các hiện tượng.",
  },
  {
    code: "A",
    name: "Artistic (Sáng tạo - Nghệ thuật)",
    shortName: "Sáng tạo",
    questions: ["q_a_visual_expression", "q_a_original_ideas"],
    color: "from-purple-600 to-pink-600",
    bgLight: "bg-purple-50 text-purple-700 border-purple-200",
    barColor: "bg-gradient-to-t from-purple-600 to-pink-400",
    icon: Palette,
    keywords: ["Thiết kế", "Mỹ thuật", "Truyền thông", "Kể chuyện", "Âm nhạc"],
    desc: "Thích tự do sáng tạo, thể hiện ý tưởng độc đáo qua hình ảnh, màu sắc, âm thanh, văn học hoặc thiết kế. Ưu tiên môi trường làm việc linh hoạt, không gò bó theo khuôn mẫu truyền thống.",
  },
  {
    code: "S",
    name: "Social (Xã hội - Hỗ trợ)",
    shortName: "Xã hội",
    questions: ["q_s_support", "q_s_teach"],
    color: "from-emerald-600 to-green-600",
    bgLight: "bg-emerald-50 text-emerald-700 border-emerald-200",
    barColor: "bg-gradient-to-t from-emerald-600 to-green-400",
    icon: Users,
    keywords: ["Giáo dục", "Tâm lý", "Y tế", "Cộng đồng", "Hỗ trợ"],
    desc: "Thích giúp đỡ, giảng dạy, tư vấn, chăm sóc sức khỏe, lắng nghe và đồng cảm với người khác. Có năng lực tuyệt vời trong việc giao tiếp, kết nối và mang lại giá trị thiết thực cho cộng đồng.",
  },
  {
    code: "E",
    name: "Enterprising (Quản lý - Dẫn dắt)",
    shortName: "Quản lý",
    questions: ["q_e_persuade", "q_e_initiate"],
    color: "from-amber-600 to-orange-600",
    bgLight: "bg-amber-50 text-amber-800 border-amber-200",
    barColor: "bg-gradient-to-t from-amber-600 to-orange-400",
    icon: TrendingUp,
    keywords: ["Kinh doanh", "Lãnh đạo", "Marketing", "Khởi nghiệp", "Đàm phán"],
    desc: "Thích thuyết phục, lãnh đạo, khởi xướng dự án mới, điều phối đội nhóm và kinh doanh. Có tầm nhìn, dám chịu trách nhiệm và hướng đến mục tiêu tổ chức hoặc tác động kinh tế.",
  },
  {
    code: "C",
    name: "Conventional (Quy trình - Nghiệp vụ)",
    shortName: "Quy trình",
    questions: ["q_c_structure", "q_c_detail"],
    color: "from-slate-700 to-gray-800",
    bgLight: "bg-slate-100 text-slate-800 border-slate-300",
    barColor: "bg-gradient-to-t from-slate-600 to-gray-400",
    icon: CheckCircle2,
    keywords: ["Kế toán", "Hành chính", "Tài chính", "Quy trình", "Excel/Dữ liệu"],
    desc: "Thích làm việc theo quy trình, cấu trúc rõ ràng, chú ý đến từng chi tiết nhỏ, kiểm tra lỗi và sắp xếp hồ sơ, dữ liệu chính xác. Có tính kỷ luật và khả năng tổ chức công việc khoa học.",
  },
];

// Subjects / Competency Domains in Student Vector
const SUBJECT_DOMAINS = [
  {
    id: "quant",
    name: "Toán & Tư duy định lượng",
    shortName: "Toán & Định lượng",
    subjects: ["Toán học", "Thống kê", "Tin học", "Phân tích số liệu"],
    questions: ["q_quant_numbers", "q_quant_models"],
    barColor: "bg-gradient-to-t from-blue-600 to-cyan-400",
    bgLight: "bg-blue-50 text-blue-800 border-blue-200",
    icon: Zap,
    desc: "Khả năng làm việc thoải mái với con số, tỉ lệ, thống kê, tư duy logic, đồng thời mô hình hóa các vấn đề thực tế thành công thức hoặc biểu đồ dễ so sánh.",
  },
  {
    id: "verbal",
    name: "Ngôn ngữ & Giao tiếp",
    shortName: "Ngôn ngữ",
    subjects: ["Ngữ văn", "Tiếng Anh", "Ngoại ngữ", "Truyền thông"],
    questions: ["q_verbal_explain", "q_verbal_write"],
    barColor: "bg-gradient-to-t from-purple-600 to-indigo-400",
    bgLight: "bg-purple-50 text-purple-800 border-purple-200",
    icon: BookOpen,
    desc: "Năng lực diễn đạt ý tưởng mạch lạc qua lời nói và văn viết, giải thích vấn đề phức tạp một cách dễ hiểu, thuyết trình và tổ chức thông tin chuyên nghiệp.",
  },
  {
    id: "science",
    name: "Khoa học tự nhiên & Thực nghiệm",
    shortName: "KHTN & Thực nghiệm",
    subjects: ["Vật lý", "Hóa học", "Sinh học", "KHTN"],
    questions: ["q_science_experiment", "q_science_evidence"],
    barColor: "bg-gradient-to-t from-emerald-600 to-teal-400",
    bgLight: "bg-emerald-50 text-emerald-800 border-emerald-200",
    icon: Sparkles,
    desc: "Sự hứng thú với khám phá khoa học, làm thí nghiệm, quan sát hiện tượng tự nhiên và kiểm chứng giả thuyết bằng bằng chứng, dữ liệu thực tế và tư duy phản biện.",
  },
  {
    id: "tech",
    name: "Tin học & Công nghệ số",
    shortName: "Tin học & Công nghệ",
    subjects: ["Tin học", "Lập trình", "Trí tuệ nhân tạo (AI)", "Công nghệ"],
    questions: ["q_tech_tools", "q_tech_automation"],
    barColor: "bg-gradient-to-t from-cyan-600 to-blue-400",
    bgLight: "bg-cyan-50 text-cyan-800 border-cyan-200",
    icon: Wrench,
    desc: "Sự nhạy bén với công cụ phần mềm, thiết bị số, tự động hóa quy trình lặp lại bằng code hoặc giải pháp công nghệ, cùng tư duy hệ thống hiện đại.",
  },
  {
    id: "social",
    name: "KHXH & Thấu hiểu nhân văn",
    shortName: "KHXH & Nhân văn",
    subjects: ["Lịch sử", "Địa lý", "GDCD", "Tâm lý học", "Sociology"],
    questions: ["q_social_empathy", "q_social_context"],
    barColor: "bg-gradient-to-t from-amber-600 to-rose-400",
    bgLight: "bg-amber-50 text-amber-900 border-amber-200",
    icon: Users,
    desc: "Khả năng thấu hiểu cảm xúc, tâm lý con người, đánh giá các sự kiện trong bối cảnh lịch sử, văn hóa, gia đình và xã hội để tạo ra tác động cộng đồng bền vững.",
  },
  {
    id: "art",
    name: "Mỹ thuật, Thiết kế & Sáng tạo",
    shortName: "Mỹ thuật & Sáng tạo",
    subjects: ["Mỹ thuật", "Âm nhạc", "Thiết kế sản phẩm", "Kiến trúc"],
    questions: ["q_creativity_many_ideas", "q_creativity_prototype"],
    barColor: "bg-gradient-to-t from-pink-600 to-rose-400",
    bgLight: "bg-pink-50 text-pink-800 border-pink-200",
    icon: Palette,
    desc: "Năng lực tạo ra nhiều ý tưởng mới lạ cho cùng một vấn đề, sẵn sàng thử nghiệm phương án mới, tạo bản nháp nhanh (prototype) và cải tiến liên tục qua phản hồi.",
  },
];

// Values Domains in Student Vector
const VALUES_DATA = [
  {
    id: "independence",
    name: "Độc lập & Tự chủ (Independence)",
    shortName: "Độc lập & Tự chủ",
    questions: ["q_independent_plan", "q_independent_deepwork", "q_a_original_ideas"],
    barColor: "bg-gradient-to-t from-amber-600 to-yellow-400",
    bgLight: "bg-amber-50 text-amber-800 border-amber-200",
    icon: Sparkles,
    keywords: ["Độc lập", "Tự chủ", "Tự do", "Chủ động", "Không gò bó"],
    desc: "Tự lập kế hoạch học tập, làm việc, chủ động kiểm soát tiến độ và thích không gian tự do không bị gò bó bởi các khuôn mẫu.",
  },
  {
    id: "leadership",
    name: "Lãnh đạo & Ảnh hưởng (Leadership)",
    shortName: "Lãnh đạo & Ảnh hưởng",
    questions: ["q_leadership_coordinate", "q_leadership_decide", "q_e_persuade", "q_e_initiate"],
    barColor: "bg-gradient-to-t from-orange-600 to-amber-400",
    bgLight: "bg-orange-50 text-orange-800 border-orange-200",
    icon: TrendingUp,
    keywords: ["Lãnh đạo", "Quyết định", "Điều phối", "Tầm ảnh hưởng", "Quản lý"],
    desc: "Thích điều phối nhóm, phân chia nhiệm vụ, sẵn sàng ra quyết định khi nhóm phân vân và có tầm ảnh hưởng tích cực tới tập thể.",
  },
  {
    id: "innovation",
    name: "Sáng tạo & Đổi mới (Innovation)",
    shortName: "Sáng tạo & Đổi mới",
    questions: ["q_creativity_many_ideas", "q_creativity_prototype", "q_a_visual_expression"],
    barColor: "bg-gradient-to-t from-pink-600 to-rose-400",
    bgLight: "bg-pink-50 text-pink-800 border-pink-200",
    icon: Palette,
    keywords: ["Sáng tạo", "Đột phá", "Ý tưởng mới", "Thử nghiệm", "Đổi mới"],
    desc: "Liên tục tìm kiếm giải pháp mới lạ, tạo ra các bản mẫu thử nghiệm (prototype) và không ngừng đổi mới tư duy, sản phẩm.",
  },
  {
    id: "empathy",
    name: "Đồng cảm & Cộng đồng (Social Impact)",
    shortName: "Đồng cảm & Cộng đồng",
    questions: ["q_social_empathy", "q_social_context", "q_s_support", "q_s_teach", "q_collab_team"],
    barColor: "bg-gradient-to-t from-emerald-600 to-green-400",
    bgLight: "bg-emerald-50 text-emerald-800 border-emerald-200",
    icon: Users,
    keywords: ["Cộng đồng", "Giúp đỡ", "Chăm sóc", "Tình nguyện", "Nhân văn"],
    desc: "Nhạy bén với cảm xúc của người khác, đặt lợi ích cộng đồng lên cao và luôn sẵn sàng hỗ trợ, chia sẻ tri thức cùng mọi người.",
  },
  {
    id: "precision",
    name: "Chính xác & Kỷ luật (Precision)",
    shortName: "Chính xác & Kỷ luật",
    questions: ["q_c_structure", "q_c_detail", "q_science_evidence", "q_quant_numbers"],
    barColor: "bg-gradient-to-t from-slate-700 to-gray-500",
    bgLight: "bg-slate-100 text-slate-800 border-slate-300",
    icon: CheckCircle2,
    keywords: ["Chính xác", "Kỷ luật", "Tỉ mỉ", "Cẩn thận", "Quy chuẩn"],
    desc: "Đề cao tính chính xác tuyệt đối, tuân thủ tiêu chuẩn, quy trình kỹ lưỡng và cẩn trọng trong từng số liệu hay tài liệu.",
  },
  {
    id: "efficiency",
    name: "Thực tế & Hiệu quả (Efficiency)",
    shortName: "Thực tế & Hiệu quả",
    questions: ["q_analytical_compare", "q_r_hands_on", "q_tech_automation", "q_quant_models"],
    barColor: "bg-gradient-to-t from-blue-600 to-cyan-400",
    bgLight: "bg-blue-50 text-blue-800 border-blue-200",
    icon: Zap,
    keywords: ["Hiệu quả", "Thực tiễn", "Tối ưu", "Tự động hóa", "Giải pháp"],
    desc: "Hướng tới kết quả thực tiễn, tối ưu hóa quy trình làm việc và áp dụng công cụ tự động hóa để tiết kiệm thời gian, công sức.",
  },
];

// Interests Domains in Student Vector
const INTERESTS_DATA = [
  {
    id: "tech_ai",
    name: "Công nghệ & Số hóa (Tech & AI)",
    shortName: "Công nghệ & AI",
    questions: ["q_tech_tools", "q_tech_automation", "q_quant_models"],
    barColor: "bg-gradient-to-t from-cyan-600 to-blue-400",
    bgLight: "bg-cyan-50 text-cyan-800 border-cyan-200",
    icon: Zap,
    keywords: ["Lập trình", "AI/Công nghệ", "Phần mềm", "Tự động hóa", "Máy tính"],
    desc: "Đam mê khám phá phần mềm, thiết bị số, lập trình, trí tuệ nhân tạo (AI) và ứng dụng công nghệ để giải quyết bài toán hiện đại.",
  },
  {
    id: "science_res",
    name: "Khoa học & Nghiên cứu (Science)",
    shortName: "Khoa học & Nghiên cứu",
    questions: ["q_i_research", "q_i_patterns", "q_science_experiment", "q_science_evidence"],
    barColor: "bg-gradient-to-t from-teal-600 to-emerald-400",
    bgLight: "bg-teal-50 text-teal-800 border-teal-200",
    icon: Search,
    keywords: ["Nghiên cứu", "Thí nghiệm", "Khám phá", "Khoa học", "Quy luật"],
    desc: "Hứng thú với việc tự tìm hiểu sâu, đọc tài liệu chuyên ngành, thực hiện thí nghiệm và khám phá quy luật tự nhiên, xã hội.",
  },
  {
    id: "art_design",
    name: "Sáng tạo & Nghệ thuật (Art & Design)",
    shortName: "Sáng tạo & Mỹ thuật",
    questions: ["q_a_visual_expression", "q_a_original_ideas", "q_creativity_many_ideas", "q_creativity_prototype"],
    barColor: "bg-gradient-to-t from-purple-600 to-pink-400",
    bgLight: "bg-purple-50 text-purple-800 border-purple-200",
    icon: Palette,
    keywords: ["Mỹ thuật", "Thiết kế", "Âm nhạc", "Nghệ thuật", "Truyền thông"],
    desc: "Yêu thích thiết kế đồ họa, vẽ, âm nhạc, kể chuyện và sáng tạo nội dung truyền thông theo phong cách độc đáo, ấn tượng.",
  },
  {
    id: "social_edu",
    name: "Con người & Giáo dục (Social & Edu)",
    shortName: "Con người & Giáo dục",
    questions: ["q_s_support", "q_s_teach", "q_social_empathy", "q_social_context"],
    barColor: "bg-gradient-to-t from-emerald-600 to-green-400",
    bgLight: "bg-emerald-50 text-emerald-800 border-emerald-200",
    icon: Users,
    keywords: ["Giảng dạy", "Tâm lý học", "Chia sẻ", "Đồng hành", "Giáo dục"],
    desc: "Thích tương tác, đồng hành, hướng dẫn bạn bè, tâm lý học con người và các hoạt động tình nguyện mang ý nghĩa cộng đồng.",
  },
  {
    id: "business_proj",
    name: "Kinh doanh & Khởi xướng (Business)",
    shortName: "Kinh doanh & Dự án",
    questions: ["q_e_persuade", "q_e_initiate", "q_collab_team"],
    barColor: "bg-gradient-to-t from-amber-600 to-orange-400",
    bgLight: "bg-amber-50 text-amber-800 border-amber-200",
    icon: TrendingUp,
    keywords: ["Kinh doanh", "Khởi nghiệp", "Marketing", "Dự án", "Tài chính"],
    desc: "Quan tâm đến kinh doanh, marketing, quản lý tài chính, khởi xướng dự án và rủ rê đội nhóm cùng biến ý tưởng thành hiện thực.",
  },
  {
    id: "hands_on",
    name: "Thực hành & Kỹ thuật (Hands-on)",
    shortName: "Thực hành & Kỹ thuật",
    questions: ["q_r_hands_on", "q_r_tools_build", "q_c_structure"],
    barColor: "bg-gradient-to-t from-blue-600 to-indigo-400",
    bgLight: "bg-blue-50 text-blue-800 border-blue-200",
    icon: Wrench,
    keywords: ["Chế tạo", "Lắp ráp", "Sửa chữa", "Công cụ", "Mô hình"],
    desc: "Thích tự tay lắp ráp, chế tạo, sửa chữa đồ đạc, làm việc với mô hình vật lý và tiếp xúc trực tiếp với thế giới thực tế.",
  },
];

// Strengths / Skills Domains in Student Vector
const STRENGTHS_DATA = [
  {
    id: "analytical",
    name: "Tư duy phân tích & Logic (Analytical)",
    shortName: "Tư duy phân tích",
    questions: ["q_quant_numbers", "q_quant_models", "q_analytical_breakdown", "q_analytical_compare", "q_i_patterns"],
    barColor: "bg-gradient-to-t from-blue-600 to-cyan-400",
    bgLight: "bg-blue-50 text-blue-800 border-blue-200",
    icon: Zap,
    keywords: ["Phân tích", "Tư duy logic", "Phản biện", "Số liệu", "Giải bài toán"],
    desc: "Thế mạnh vượt trội trong việc phân tích số liệu, chia nhỏ bài toán phức tạp và tư duy rành mạch, logic để tìm ra bản chất vấn đề.",
  },
  {
    id: "communication",
    name: "Giao tiếp & Thuyết trình (Communication)",
    shortName: "Giao tiếp & Diễn đạt",
    questions: ["q_verbal_explain", "q_verbal_write", "q_e_persuade", "q_s_teach"],
    barColor: "bg-gradient-to-t from-purple-600 to-indigo-400",
    bgLight: "bg-purple-50 text-purple-800 border-purple-200",
    icon: BookOpen,
    keywords: ["Thuyết trình", "Giao tiếp", "Truyền đạt", "Viết lách", "Thuyết phục"],
    desc: "Khả năng truyền đạt ý tưởng tự tin qua lời nói, văn viết, thuyết trình cuốn hút và thuyết phục người nghe một cách tự nhiên.",
  },
  {
    id: "teamwork",
    name: "Làm việc nhóm & Hợp tác (Teamwork)",
    shortName: "Làm việc nhóm",
    questions: ["q_collab_team", "q_collab_feedback", "q_social_empathy", "q_s_support"],
    barColor: "bg-gradient-to-t from-emerald-600 to-teal-400",
    bgLight: "bg-emerald-50 text-emerald-800 border-emerald-200",
    icon: Users,
    keywords: ["Làm việc nhóm", "Hợp tác", "Lắng nghe", "Đồng thuận", "Kết nối"],
    desc: "Kết nối tốt với đồng đội, biết lắng nghe, sẵn sàng tiếp thu góp ý và tạo ra sự đồng thuận để hoàn thành mục tiêu chung.",
  },
  {
    id: "creative_solving",
    name: "Sáng tạo & Thử nghiệm (Creative Solving)",
    shortName: "Sáng tạo & Thử nghiệm",
    questions: ["q_creativity_many_ideas", "q_creativity_prototype", "q_a_original_ideas", "q_a_visual_expression"],
    barColor: "bg-gradient-to-t from-pink-600 to-rose-400",
    bgLight: "bg-pink-50 text-pink-800 border-pink-200",
    icon: Palette,
    keywords: ["Giải quyết sáng tạo", "Linh hoạt", "Thử nghiệm nhanh", "Ý tưởng", "Đổi mới"],
    desc: "Luôn có nhiều góc nhìn đột phá cho một tình huống, nhanh nhạy tạo ra giải pháp mới và thử nghiệm mô hình thực tế hiệu quả.",
  },
  {
    id: "leadership_org",
    name: "Lãnh đạo & Tổ chức (Leadership & Org)",
    shortName: "Lãnh đạo & Tổ chức",
    questions: ["q_e_initiate", "q_leadership_coordinate", "q_leadership_decide", "q_c_structure", "q_independent_plan"],
    barColor: "bg-gradient-to-t from-orange-600 to-amber-400",
    bgLight: "bg-orange-50 text-orange-800 border-orange-200",
    icon: TrendingUp,
    keywords: ["Tổ chức công việc", "Quản lý tiến độ", "Điều phối", "Dẫn dắt", "Lập kế hoạch"],
    desc: "Năng lực lập kế hoạch rõ ràng, điều phối tiến độ khoa học, dẫn dắt đội nhóm và quyết đoán trong những thời điểm quan trọng.",
  },
  {
    id: "tech_digital",
    name: "Kỹ năng số & Công nghệ (Digital & Tech)",
    shortName: "Kỹ năng số & Tech",
    questions: ["q_tech_tools", "q_tech_automation", "q_r_tools_build", "q_c_detail"],
    barColor: "bg-gradient-to-t from-cyan-600 to-teal-400",
    bgLight: "bg-cyan-50 text-cyan-800 border-cyan-200",
    icon: Wrench,
    keywords: ["Thành thạo công cụ", "Kỹ năng số", "AI/Phần mềm", "Kỹ thuật", "Tỉ mỉ"],
    desc: "Sử dụng thành thạo các công cụ số, AI, tự động hóa và có khả năng làm việc chính xác, tỉ mỉ với hệ thống kỹ thuật hiện đại.",
  },
];

interface DomainScoreItem {
  id: string;
  name: string;
  shortName: string;
  barColor: string;
  bgLight: string;
  icon: React.ElementType;
  desc: string;
  score: number;
  percentage: number;
  subjects?: string[];
  keywords?: string[];
}

interface DomainChartTabProps {
  badgeText: string;
  badgeIcon: React.ElementType;
  badgeColorClass: string;
  title: string;
  desc: string;
  highestLabel: string;
  highestColorClass: string;
  chartBorderClass: string;
  chartBgClass: string;
  blurColor1Class: string;
  blurColor2Class: string;
  gridLineColorClass: string;
  gridLabelColorClass: string;
  hoverShadowClass: string;
  hoverBorderClass: string;
  activeBadgeBgClass: string;
  activeBadgeText: string;
  items: DomainScoreItem[];
  selectedTags: string[];
  selectedBannerTitle: string;
  selectedBannerDesc: string;
  selectedTone?: "slate" | "teal" | "amber";
  emptyText: string;
  gridTitle: string;
  gridIcon: React.ElementType;
  gridIconColorClass: string;
  footerLabel: string;
  isItemActive: (item: DomainScoreItem, selectedTags: string[]) => boolean;
  auxContent?: React.ReactNode;
}

function DomainChartTab({
  badgeText,
  badgeIcon: BadgeIcon,
  badgeColorClass,
  title,
  desc,
  highestLabel,
  highestColorClass,
  chartBorderClass,
  chartBgClass,
  blurColor1Class,
  blurColor2Class,
  gridLineColorClass,
  gridLabelColorClass,
  hoverShadowClass,
  hoverBorderClass,
  activeBadgeBgClass,
  activeBadgeText,
  items,
  selectedTags,
  selectedBannerTitle,
  selectedBannerDesc,
  selectedTone = "slate",
  emptyText,
  gridTitle,
  gridIcon: GridIcon,
  gridIconColorClass,
  footerLabel,
  isItemActive,
  auxContent,
}: DomainChartTabProps) {
  return (
    <div className="space-y-8 animate-fade-up">
      {/* Column Chart Section */}
      <div className={`relative overflow-hidden rounded-3xl border ${chartBorderClass} ${chartBgClass} p-6 text-white shadow-2xl sm:p-8`}>
        <div className={`absolute -right-20 -top-20 h-64 w-64 rounded-full ${blurColor1Class} blur-3xl`} />
        <div className={`absolute -bottom-20 -left-20 h-64 w-64 rounded-full ${blurColor2Class} blur-3xl`} />

        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold border ${badgeColorClass}`}>
              <BadgeIcon size={14} />
              {badgeText}
            </span>
            <h3 className="mt-2.5 font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
              {title}
            </h3>
            <p className="mt-1 text-xs text-slate-300 sm:text-sm">
              {desc}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-3.5 py-2 text-right border border-white/10 backdrop-blur-sm">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">{highestLabel}</div>
            <div className={`text-sm font-extrabold ${highestColorClass}`}>
              {items.reduce((prev, curr) => (curr.score > prev.score ? curr : prev)).shortName}
            </div>
          </div>
        </div>

        {/* Column Chart Area Container */}
        <div className="mt-8 pt-4 w-full overflow-x-auto no-scrollbar pb-2">
          <div className="min-w-[340px] sm:min-w-0">
            {/* Chart Grid & Bars Box */}
            <div className={`relative flex h-56 sm:h-64 items-end justify-between gap-1.5 sm:gap-6 border-b-2 ${chartBorderClass} px-2 sm:px-8`}>
              {/* Horizontal Grid Lines */}
              {[
                { label: "5.0", bottom: "100%" },
                { label: "4.0", bottom: "80%" },
                { label: "3.0", bottom: "60%" },
                { label: "2.0", bottom: "40%" },
                { label: "1.0", bottom: "20%" },
              ].map((line) => (
                <div
                  key={line.label}
                  className={`absolute left-0 right-0 border-t ${gridLineColorClass} pointer-events-none`}
                  style={{ bottom: line.bottom }}
                >
                  <span className={`absolute -top-2.5 left-0 text-[10px] font-bold ${gridLabelColorClass} select-none`}>
                    {line.label}
                  </span>
                </div>
              ))}

              {/* Bars Loop */}
              {items.map((item) => {
                const active = isItemActive(item, selectedTags);
                const barHeightPct = Math.min(100, Math.max(12, (item.score / 5.0) * 100));

                return (
                  <div
                    key={item.id}
                    className="group relative z-10 flex h-full flex-1 flex-col items-center justify-end"
                  >
                    {/* Score Badge directly above bar */}
                    <div className="mb-2 flex flex-col items-center transition-transform duration-300 group-hover:-translate-y-1">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-black shadow-lg ${active ? "bg-amber-400 text-slate-950 ring-2 ring-amber-300" : "bg-white/20 text-white backdrop-blur-md border border-white/30"}`}>
                        {item.score}
                      </span>
                    </div>

                    {/* The Actual Column Bar */}
                    <div className="relative w-full max-w-[56px] flex-1 flex items-end justify-center">
                      <div
                        style={{ height: `${barHeightPct}%` }}
                        className={`w-full rounded-t-xl transition-all duration-700 ease-out ${item.barColor} relative overflow-hidden shadow-xl border-t border-x border-white/30 group-hover:brightness-125 group-hover:scale-x-105 ${hoverShadowClass}`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-black/10 pointer-events-none" />
                        {active && (
                          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/30 to-white/50 animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-Axis Labels & Icons (Below the baseline) */}
            <div className="mt-3.5 flex justify-between gap-2 px-2 sm:gap-6 sm:px-8">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item, selectedTags);
                return (
                  <div key={item.id} className="group flex flex-1 flex-col items-center text-center">
                    <span className={`grid h-9 w-9 place-items-center rounded-xl transition-all duration-300 group-hover:scale-110 ${active ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/30 ring-2 ring-white" : "bg-white/10 text-slate-300 border border-white/10 group-hover:bg-white/20 group-hover:text-white"}`}>
                      <Icon size={18} />
                    </span>
                    <span className={`mt-1.5 text-xs font-bold line-clamp-2 max-w-[85px] transition-colors ${active ? "text-amber-300 font-extrabold" : "text-slate-300 group-hover:text-white"}`}>
                      {item.shortName}
                    </span>
                    {active && (
                      <span className="mt-1 inline-block rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300 border border-amber-400/30">
                        {activeBadgeText}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-3 text-center text-[11px] font-semibold text-slate-400">
          * Các cột có hiệu ứng nổi bật trùng khớp với sự lựa chọn bạn đã khai báo trong bài đánh giá.
        </div>
      </div>

      {/* Selected Tags Banner */}
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-800 text-white shadow-md">
              <GraduationCap size={22} />
            </span>
            <div>
              <h4 className="m-0 font-display text-base font-extrabold text-slate-900">
                {selectedBannerTitle}
              </h4>
              <p className="m-0 text-xs text-slate-500">
                {selectedBannerDesc}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <TagList values={selectedTags.slice(0, 3)} empty={emptyText} tone={selectedTone} />
          </div>
        </div>
      </div>

      {/* Breakdown Cards Grid */}
      <div>
        <h3 className="mb-4 font-display text-lg font-bold text-slate-900 flex items-center gap-2">
          <GridIcon size={18} className={gridIconColorClass} />
          {gridTitle}
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item, selectedTags);
            return (
              <div
                key={item.id}
                className={`card p-5 transition-all duration-300 hover:shadow-md ${
                  active ? hoverBorderClass : "bg-white/90"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${item.bgLight} shadow-sm`}>
                      <Icon size={20} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="m-0 font-display text-base font-extrabold text-slate-900">
                          {item.name}
                        </h4>
                        {active && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${activeBadgeBgClass}`}>
                            {activeBadgeText}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <span>Điểm đánh giá: <strong className="text-slate-900">{item.score}/5.0</strong></span>
                        <span>•</span>
                        <span>Năng lực: <strong className="text-slate-700">{item.percentage}%</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full transition-all duration-700 ${item.barColor}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>

                <p className="m-0 mt-3 text-xs leading-relaxed text-slate-600">
                  {item.desc}
                </p>

                {(item.subjects || item.keywords) && (
                  <div className="mt-3.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 mr-1">{footerLabel}</span>
                    {(item.subjects || item.keywords || []).map((tag) => (
                      <span key={tag} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {auxContent}
    </div>
  );
}

export function ProfileVectorSection({ profile }: ProfileVectorSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"riasec" | "subjects" | "values" | "interests" | "strengths" | "context">("riasec");

  const openModal = (tab: "riasec" | "subjects" | "values" | "interests" | "strengths" | "context") => {
    setActiveTab(tab);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    if (modalOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [modalOpen]);

  // Pre-calculate scores for RIASEC
  const riasecScores = RIASEC_DATA.map((item) => ({
    ...item,
    ...computeVectorScore(profile.assessmentAnswers, item.questions),
  }));

  // Pre-calculate scores for Subject Domains
  const subjectScores = SUBJECT_DOMAINS.map((item) => ({
    ...item,
    ...computeVectorScore(profile.assessmentAnswers, item.questions),
  }));

  // Pre-calculate scores for Values
  const valueScores = VALUES_DATA.map((item) => ({
    ...item,
    ...computeVectorScore(profile.assessmentAnswers, item.questions),
  }));

  // Pre-calculate scores for Interests
  const interestScores = INTERESTS_DATA.map((item) => ({
    ...item,
    ...computeVectorScore(profile.assessmentAnswers, item.questions),
  }));

  // Pre-calculate scores for Strengths
  const strengthScores = STRENGTHS_DATA.map((item) => ({
    ...item,
    ...computeVectorScore(profile.assessmentAnswers, item.questions),
  }));

  // Top scoring items for RIASEC and Subjects
  const top3RiasecList = [...riasecScores].sort((a, b) => b.score - a.score).slice(0, 3);
  const top3RiasecCodes = new Set(top3RiasecList.map((item) => item.code));
  const top3RiasecThreshold = top3RiasecList[2]?.score ?? 0;

  const top3SubjectList = [...subjectScores].sort((a, b) => b.score - a.score).slice(0, 3);
  const top3SubjectIds = new Set(top3SubjectList.map((item) => item.id));
  const top3SubjectThreshold = top3SubjectList[2]?.score ?? 0;

  const top3ValueList = [...valueScores].sort((a, b) => b.score - a.score).slice(0, 3);
  const top3ValueIds = new Set(top3ValueList.map((item) => item.id));
  const top3ValueThreshold = top3ValueList[2]?.score ?? 0;

  const top3InterestList = [...interestScores].sort((a, b) => b.score - a.score).slice(0, 3);
  const top3InterestIds = new Set(top3InterestList.map((item) => item.id));
  const top3InterestThreshold = top3InterestList[2]?.score ?? 0;

  const top3StrengthList = [...strengthScores].sort((a, b) => b.score - a.score).slice(0, 3);
  const top3StrengthIds = new Set(top3StrengthList.map((item) => item.id));
  const top3StrengthThreshold = top3StrengthList[2]?.score ?? 0;

  return (
    <>
      <section className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* RIASEC Card - Clickable */}
        <article
          onClick={() => openModal("riasec")}
          className="card card-hover group relative flex cursor-pointer flex-col justify-between overflow-hidden border-teal-200/80 bg-gradient-to-br from-white via-white to-teal-50/30 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-teal-500 hover:shadow-xl"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="chip-teal">RIASEC</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-700 opacity-0 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100">
                <BarChart3 size={16} />
              </span>
            </div>
            <h2 className="mb-2 mt-3 font-display text-[17px] font-bold leading-tight tracking-tight text-slate-900 group-hover:text-teal-800">
              Nhóm nổi bật
            </h2>
            <TagList values={top3RiasecList.map((item) => `${item.code} - ${item.shortName} (${item.score})`)} empty="Chưa có RIASEC." tone="teal" />
          </div>
          <div className="mt-5 flex items-center justify-between rounded-xl bg-teal-50 px-3.5 py-2.5 text-xs font-bold text-teal-700 ring-1 ring-teal-600/20 transition-all duration-300 group-hover:bg-teal-600 group-hover:text-white group-hover:shadow-md">
            <span className="flex items-center gap-1.5">
              <BarChart3 size={15} />
              Xem biểu đồ RIASEC
            </span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </div>
        </article>

        {/* Subjects Card - Clickable */}
        <article
          onClick={() => openModal("subjects")}
          className="card card-hover group relative flex cursor-pointer flex-col justify-between overflow-hidden border-slate-300/80 bg-gradient-to-br from-white via-white to-indigo-50/20 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-500 hover:shadow-xl"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="chip-slate">Môn học</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 opacity-0 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100">
                <BarChart3 size={16} />
              </span>
            </div>
            <h2 className="mb-2 mt-3 font-display text-[17px] font-bold leading-tight tracking-tight text-slate-900 group-hover:text-indigo-800">
              Môn học liên quan
            </h2>
            <TagList values={top3SubjectList.map((item) => `${item.shortName} (${item.score})`)} empty="Chưa có môn học." />
          </div>
          <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-700 ring-1 ring-slate-400/30 transition-all duration-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-md">
            <span className="flex items-center gap-1.5">
              <BarChart3 size={15} />
              Xem biểu đồ môn học
            </span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </div>
        </article>

        {/* Values Card - Clickable */}
        <article
          onClick={() => openModal("values")}
          className="card card-hover group relative flex cursor-pointer flex-col justify-between overflow-hidden border-amber-200/80 bg-gradient-to-br from-white via-white to-amber-50/20 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-500 hover:shadow-xl"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="chip-amber">Giá trị</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 opacity-0 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100">
                <BarChart3 size={16} />
              </span>
            </div>
            <h2 className="mb-2 mt-3 font-display text-[17px] font-bold leading-tight tracking-tight text-slate-900 group-hover:text-amber-800">
              Giá trị nghề nghiệp
            </h2>
            <TagList values={top3ValueList.map((item) => `${item.shortName} (${item.score})`)} empty="Chưa có giá trị." tone="amber" />
          </div>
          <div className="mt-5 flex items-center justify-between rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-700 ring-1 ring-amber-600/20 transition-all duration-300 group-hover:bg-amber-600 group-hover:text-white group-hover:shadow-md">
            <span className="flex items-center gap-1.5">
              <BarChart3 size={15} />
              Xem biểu đồ giá trị
            </span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </div>
        </article>

        {/* Interests Card - Clickable */}
        <article
          onClick={() => openModal("interests")}
          className="card card-hover group relative flex cursor-pointer flex-col justify-between overflow-hidden border-teal-200/80 bg-gradient-to-br from-white via-white to-teal-50/20 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-teal-500 hover:shadow-xl"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="chip-teal">Sở thích</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-700 opacity-0 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100">
                <BarChart3 size={16} />
              </span>
            </div>
            <h2 className="mb-2 mt-3 font-display text-[17px] font-bold leading-tight tracking-tight text-slate-900 group-hover:text-teal-800">
              Sở thích & Đam mê
            </h2>
            <TagList values={top3InterestList.map((item) => `${item.shortName} (${item.score})`)} empty="Chưa có sở thích." tone="teal" />
          </div>
          <div className="mt-5 flex items-center justify-between rounded-xl bg-teal-50 px-3.5 py-2.5 text-xs font-bold text-teal-700 ring-1 ring-teal-600/20 transition-all duration-300 group-hover:bg-teal-600 group-hover:text-white group-hover:shadow-md">
            <span className="flex items-center gap-1.5">
              <BarChart3 size={15} />
              Xem biểu đồ sở thích
            </span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </div>
        </article>

        {/* Strengths Card - Clickable */}
        <article
          onClick={() => openModal("strengths")}
          className="card card-hover group relative flex cursor-pointer flex-col justify-between overflow-hidden border-blue-200/80 bg-gradient-to-br from-white via-white to-blue-50/20 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-500 hover:shadow-xl"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="chip-slate">Kỹ năng</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 opacity-0 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100">
                <BarChart3 size={16} />
              </span>
            </div>
            <h2 className="mb-2 mt-3 font-display text-[17px] font-bold leading-tight tracking-tight text-slate-900 group-hover:text-blue-800">
              Thế mạnh nổi trội
            </h2>
            <TagList values={top3StrengthList.map((item) => `${item.shortName} (${item.score})`)} empty="Chưa có kỹ năng." />
          </div>
          <div className="mt-5 flex items-center justify-between rounded-xl bg-blue-50 px-3.5 py-2.5 text-xs font-bold text-blue-700 ring-1 ring-blue-600/20 transition-all duration-300 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-md">
            <span className="flex items-center gap-1.5">
              <BarChart3 size={15} />
              Xem biểu đồ kỹ năng
            </span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </div>
        </article>

        {/* Context Card - Clickable */}
        <article
          onClick={() => openModal("context")}
          className="card card-hover group relative flex cursor-pointer flex-col justify-between overflow-hidden border-slate-300/80 bg-gradient-to-br from-white via-white to-slate-50/40 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-500 hover:shadow-xl"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="chip-slate">Bối cảnh</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 opacity-0 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100">
                <Info size={16} />
              </span>
            </div>
            <h2 className="mb-3 mt-3 font-display text-[17px] font-bold leading-tight tracking-tight text-slate-900 group-hover:text-slate-800">
              Bối cảnh cá nhân
            </h2>
            <div className="grid gap-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 gap-2">
                <span className="font-bold text-slate-400 shrink-0">Lớp học:</span>
                <span className="font-extrabold text-slate-800 truncate">{profile.gradeLevel}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 gap-2">
                <span className="font-bold text-slate-400 shrink-0">Mục tiêu:</span>
                <span className="font-extrabold text-teal-700 truncate min-w-0 max-w-[120px] sm:max-w-[150px]" title={profile.goals}>{profile.goals}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-400 shrink-0">Lưu ý:</span>
                <span className="font-extrabold text-amber-700 truncate min-w-0 max-w-[120px] sm:max-w-[150px]" title={profile.constraints || "Không có"}>{profile.constraints || "Không có"}</span>
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-700 ring-1 ring-slate-400/30 transition-all duration-300 group-hover:bg-slate-800 group-hover:text-white group-hover:shadow-md">
            <span className="flex items-center gap-1.5">
              <Info size={15} />
              Xem chi tiết bối cảnh
            </span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </div>
        </article>
      </section>

      {/* Modal Dialog for Vector Charts & Explanations */}
      {modalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-3 backdrop-blur-md transition-opacity animate-fade-up sm:p-6"
        >
          <div className="relative flex max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-br from-slate-50 via-white to-teal-50/20 shadow-2xl">
            {/* Sticky Header */}
            <header className="flex flex-col justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-4 py-4 sm:px-6 sm:py-5 backdrop-blur-md shrink-0 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-100 text-teal-700">
                    <Sparkles size={18} />
                  </span>
                  <h2 className="m-0 font-display text-xl font-extrabold tracking-tight text-slate-900">
                    Phân tích chi tiết hồ sơ
                  </h2>
                </div>
              </div>

              {/* Tab Selector & Close Button */}
              <div className="flex items-center justify-between gap-2 sm:gap-3 sm:justify-end">
                <div className="flex min-w-0 max-w-[calc(100vw-70px)] sm:max-w-xl md:max-w-2xl overflow-x-auto shrink items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1 no-scrollbar scroll-smooth">
                  <button
                    onClick={() => setActiveTab("riasec")}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 min-h-[38px] text-xs font-bold transition-all ${
                      activeTab === "riasec"
                        ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md"
                        : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                    }`}
                  >
                    <BarChart3 size={15} />
                    <span>RIASEC</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("subjects")}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 min-h-[38px] text-xs font-bold transition-all ${
                      activeTab === "subjects"
                        ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md"
                        : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                    }`}
                  >
                    <BookOpen size={15} />
                    <span>Môn học</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("values")}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 min-h-[38px] text-xs font-bold transition-all ${
                      activeTab === "values"
                        ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md"
                        : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                    }`}
                  >
                    <Sparkles size={15} />
                    <span>Giá trị</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("interests")}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 min-h-[38px] text-xs font-bold transition-all ${
                      activeTab === "interests"
                        ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md"
                        : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                    }`}
                  >
                    <Zap size={15} />
                    <span>Sở thích</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("strengths")}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 min-h-[38px] text-xs font-bold transition-all ${
                      activeTab === "strengths"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                        : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                    }`}
                  >
                    <Award size={15} />
                    <span>Kỹ năng</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("context")}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 min-h-[38px] text-xs font-bold transition-all ${
                      activeTab === "context"
                        ? "bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-md"
                        : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                    }`}
                  >
                    <GraduationCap size={15} />
                    <span>Bối cảnh</span>
                  </button>
                </div>

                <button
                  onClick={closeModal}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition-all hover:bg-rose-50 hover:text-rose-600"
                  title="Đóng cửa sổ (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              {activeTab === "riasec" ? (
                <div className="space-y-8 animate-fade-up">
                  {/* RIASEC Column Chart Section */}
                  <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 text-white shadow-2xl sm:p-8">
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
                    <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

                    <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                      <div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/20 px-3 py-1 text-xs font-extrabold text-teal-300 border border-teal-500/30">
                          <TrendingUp size={14} />
                          RIASEC CHART
                        </span>
                        <h3 className="mt-2.5 font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
                          Biểu đồ cột RIASEC của bạn
                        </h3>
                        <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                          Thang điểm từ 1.0 đến 5.0, tính toán từ phản hồi của bạn trong bài đánh giá năng lực.
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/10 px-3.5 py-2 text-right border border-white/10 backdrop-blur-sm">
                        <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Nhóm nổi bật nhất</div>
                        <div className="text-sm font-extrabold text-teal-300">
                          {riasecScores.reduce((prev, curr) => (curr.score > prev.score ? curr : prev)).name}
                        </div>
                      </div>
                    </div>

                    {/* Column Chart Area Container */}
                    <div className="mt-8 pt-4 w-full overflow-x-auto no-scrollbar pb-2">
                      <div className="min-w-[340px] sm:min-w-0">
                        {/* Chart Grid & Bars Box */}
                        <div className="relative flex h-56 sm:h-64 items-end justify-between gap-1.5 sm:gap-6 border-b-2 border-slate-700/80 px-2 sm:px-8">
                          {/* Horizontal Grid lines */}
                          {[
                            { label: "5.0", bottom: "100%" },
                            { label: "4.0", bottom: "80%" },
                            { label: "3.0", bottom: "60%" },
                            { label: "2.0", bottom: "40%" },
                            { label: "1.0", bottom: "20%" },
                          ].map((line) => (
                            <div
                              key={line.label}
                              className="absolute left-0 right-0 border-t border-slate-800/80 pointer-events-none"
                              style={{ bottom: line.bottom }}
                            >
                              <span className="absolute -top-2.5 left-0 text-[10px] font-bold text-slate-500 select-none">
                                {line.label}
                              </span>
                            </div>
                          ))}

                          {/* Bar Columns */}
                          {riasecScores.map((item) => {
                            const isTop = top3RiasecCodes.has(item.code) || (item.score >= top3RiasecThreshold && item.score > 0);
                            const barHeightPct = Math.min(100, Math.max(12, (item.score / 5.0) * 100));

                            return (
                              <div
                                key={item.code}
                                className="group relative z-10 flex h-full flex-1 flex-col items-center justify-end"
                              >
                                {/* Score tooltip directly above bar */}
                                <div className="mb-2 flex flex-col items-center transition-transform duration-300 group-hover:-translate-y-1">
                                  <span className={`rounded-md px-2 py-0.5 text-xs font-black shadow-lg ${isTop ? "bg-teal-400 text-slate-950 ring-2 ring-teal-300" : "bg-white/20 text-white backdrop-blur-md border border-white/30"}`}>
                                    {item.score}
                                  </span>
                                </div>

                                {/* Column Bar */}
                                <div className="relative w-full max-w-[56px] flex-1 flex items-end justify-center">
                                  <div
                                    style={{ height: `${barHeightPct}%` }}
                                    className={`w-full rounded-t-xl transition-all duration-700 ease-out ${item.barColor} relative overflow-hidden shadow-xl border-t border-x border-white/30 group-hover:brightness-125 group-hover:scale-x-105 group-hover:shadow-teal-500/30`}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-black/10 pointer-events-none" />
                                    {isTop && (
                                      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/30 to-white/50 animate-pulse" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* X-Axis Labels & Icons (Below baseline) */}
                        <div className="mt-3.5 flex justify-between gap-2 px-2 sm:gap-6 sm:px-8">
                          {riasecScores.map((item) => {
                            const isTop = top3RiasecCodes.has(item.code) || (item.score >= top3RiasecThreshold && item.score > 0);
                            return (
                              <div key={item.code} className="group flex flex-1 flex-col items-center text-center">
                                <span className={`grid h-9 w-9 place-items-center rounded-xl font-display text-sm font-black transition-all duration-300 group-hover:scale-110 ${isTop ? "bg-teal-400 text-slate-950 shadow-lg shadow-teal-400/30 ring-2 ring-white" : "bg-white/10 text-slate-300 border border-white/10 group-hover:bg-white/20 group-hover:text-white"}`}>
                                  {item.code}
                                </span>
                                <span className={`mt-1.5 text-xs font-bold line-clamp-1 max-w-[85px] transition-colors ${isTop ? "text-teal-300 font-extrabold" : "text-slate-300 group-hover:text-white"}`}>
                                  {item.shortName}
                                </span>
                                {isTop && (
                                  <span className="mt-1 inline-block rounded bg-teal-400/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-teal-300 border border-teal-400/30">
                                    NỔI BẬT
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-center text-[11px] font-semibold text-slate-400">
                      * Các cột nhấp nháy hoặc nổi bật đại diện cho nhóm RIASEC chủ đạo của bạn. Nhấp vào các thẻ bên dưới để xem chi tiết.
                    </div>
                  </div>

                  {/* What is RIASEC Box */}
                  <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-r from-teal-50/80 via-white to-emerald-50/50 p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-500 text-white shadow-lg">
                        <HelpCircle size={24} />
                      </span>
                      <div>
                        <h4 className="m-0 font-display text-base font-extrabold text-slate-900">
                          Mô hình mật mã nghề nghiệp Holland (RIASEC) là gì?
                        </h4>
                        <p className="m-0 mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-600">
                          <strong>Mô hình Holland</strong> do nhà tâm lý học John L. Holland phát triển, dựa trên nguyên lý: con người sẽ đạt thành công và sự hài lòng cao nhất khi được làm việc trong môi trường phù hợp với sở thích và tính cách tự nhiên của họ. Mô hình chia tính cách thành 6 nhóm: <strong>Realistic</strong> (Thực tế), <strong>Investigative</strong> (Nghiên cứu), <strong>Artistic</strong> (Sáng tạo), <strong>Social</strong> (Xã hội), <strong>Enterprising</strong> (Quản lý) và <strong>Conventional</strong> (Quy trình).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Detailed RIASEC Cards Breakdown */}
                  <div>
                    <h3 className="mb-4 font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Info size={18} className="text-teal-600" />
                      Chi tiết 6 thành phần RIASEC

                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {riasecScores.map((item) => {
                        const isTop = top3RiasecCodes.has(item.code) || (item.score >= top3RiasecThreshold && item.score > 0);
                        return (
                          <div
                            key={item.code}
                            className={`card p-5 transition-all duration-300 hover:shadow-md ${
                              isTop ? "border-teal-400/80 ring-2 ring-teal-500/10 bg-gradient-to-br from-white to-teal-50/20" : "bg-white/90"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl font-display text-lg font-black ${item.bgLight} shadow-sm`}>
                                  {item.code}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="m-0 font-display text-base font-extrabold text-slate-900">
                                      {item.name}
                                    </h4>
                                    {isTop && (
                                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-black text-teal-800">
                                        NỔI BẬT
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                    <span>Điểm đánh giá: <strong className="text-slate-900">{item.score}/5.0</strong></span>
                                    <span>•</span>
                                    <span>Mức tương thích: <strong className="text-teal-700">{item.percentage}%</strong></span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full transition-all duration-700 ${item.barColor}`}
                                style={{ width: `${item.percentage}%` }}
                              />
                            </div>

                            <p className="m-0 mt-3 text-xs leading-relaxed text-slate-600">
                              {item.desc}
                            </p>

                            <div className="mt-3.5 flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                              {item.keywords.map((kw) => (
                                <span key={kw} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : activeTab === "subjects" ? (
                <DomainChartTab
                  badgeText="SUBJECT"
                  badgeIcon={BookOpen}
                  badgeColorClass="bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                  title="Biểu đồ năng lực theo môn học"
                  desc="Đánh giá mức độ tự tin và hứng thú với 6 lĩnh vực môn học."
                  highestLabel="Lĩnh vực quan tâm nhất"
                  highestColorClass="text-indigo-300"
                  chartBorderClass="border-indigo-900/80"
                  chartBgClass="bg-gradient-to-b from-slate-950 via-indigo-950/80 to-slate-950"
                  blurColor1Class="bg-indigo-500/15"
                  blurColor2Class="bg-cyan-500/10"
                  gridLineColorClass="border-indigo-900/60"
                  gridLabelColorClass="text-indigo-400"
                  hoverShadowClass="group-hover:shadow-indigo-500/30"
                  hoverBorderClass="border-indigo-400/80 ring-2 ring-indigo-500/10 bg-gradient-to-br from-white to-indigo-50/20"
                  activeBadgeBgClass="bg-indigo-100 text-indigo-800"
                  activeBadgeText="ĐIỂM CAO"
                  items={subjectScores}
                  selectedTags={top3SubjectList.map((i) => `${i.shortName} (${i.score})`)}
                  selectedBannerTitle="Top môn học đánh giá cao nhất"
                  selectedBannerDesc="Các môn học đạt điểm đánh giá năng lực cao nhất được ưu tiên khi đối sánh ngành học."
                  selectedTone="slate"
                  emptyText="Chưa có dữ liệu môn học."
                  gridTitle="Chi tiết 6 nhóm môn học"
                  gridIcon={BookOpen}
                  gridIconColorClass="text-indigo-600"
                  footerLabel="Môn liên quan:"
                  isItemActive={(item) => top3SubjectIds.has(item.id) || (item.score >= top3SubjectThreshold && item.score > 0)}
                />
              ) : activeTab === "values" ? (
                <DomainChartTab
                  badgeText="CAREER VALUES"
                  badgeIcon={Sparkles}
                  badgeColorClass="bg-amber-500/20 text-amber-300 border-amber-500/30"
                  title="Biểu đồ giá trị nghề nghiệp"
                  desc="Đánh giá các giá trị cốt lõi định hình môi trường học tập và làm việc lý tưởng của bạn."
                  highestLabel="Giá trị nổi bật nhất"
                  highestColorClass="text-amber-300"
                  chartBorderClass="border-amber-900/80"
                  chartBgClass="bg-gradient-to-b from-slate-950 via-amber-950/80 to-slate-950"
                  blurColor1Class="bg-amber-500/15"
                  blurColor2Class="bg-orange-500/10"
                  gridLineColorClass="border-amber-900/60"
                  gridLabelColorClass="text-amber-400"
                  hoverShadowClass="group-hover:shadow-amber-500/30"
                  hoverBorderClass="border-amber-400/80 ring-2 ring-amber-500/10 bg-gradient-to-br from-white to-amber-50/20"
                  activeBadgeBgClass="bg-amber-100 text-amber-800"
                  activeBadgeText="ĐIỂM CAO"
                  items={valueScores}
                  selectedTags={top3ValueList.map((i) => `${i.shortName} (${i.score})`)}
                  selectedBannerTitle="Top giá trị nghề nghiệp điểm cao nhất"
                  selectedBannerDesc="Các giá trị cốt lõi đạt điểm cao định hình môi trường làm việc lý tưởng của bạn."
                  selectedTone="amber"
                  emptyText="Chưa có dữ liệu giá trị nghề nghiệp."
                  gridTitle="Chi tiết 6 nhóm giá trị nghề nghiệp"
                  gridIcon={Sparkles}
                  gridIconColorClass="text-amber-600"
                  footerLabel="Từ khóa:"
                  isItemActive={(item) => top3ValueIds.has(item.id) || (item.score >= top3ValueThreshold && item.score > 0)}
                />
              ) : activeTab === "interests" ? (
                <DomainChartTab
                  badgeText="AREER INTERESTS"
                  badgeIcon={Zap}
                  badgeColorClass="bg-teal-500/20 text-teal-300 border-teal-500/30"
                  title="Biểu đồ sở thích & đam mê"
                  desc="Đánh giá mức độ hứng thú với các lĩnh vực nghề nghiệp."
                  highestLabel="Sở thích nổi bật nhất"
                  highestColorClass="text-teal-300"
                  chartBorderClass="border-teal-900/80"
                  chartBgClass="bg-gradient-to-b from-slate-950 via-teal-950/80 to-slate-950"
                  blurColor1Class="bg-teal-500/15"
                  blurColor2Class="bg-cyan-500/10"
                  gridLineColorClass="border-teal-900/60"
                  gridLabelColorClass="text-teal-400"
                  hoverShadowClass="group-hover:shadow-teal-500/30"
                  hoverBorderClass="border-teal-400/80 ring-2 ring-teal-500/10 bg-gradient-to-br from-white to-teal-50/20"
                  activeBadgeBgClass="bg-teal-100 text-teal-800"
                  activeBadgeText="ĐIỂM CAO"
                  items={interestScores}
                  selectedTags={top3InterestList.map((i) => `${i.shortName} (${i.score})`)}
                  selectedBannerTitle="Top sở thích & đam mê điểm cao nhất"
                  selectedBannerDesc="Các sở thích đạt mức hứng thú cao là động lực gắn bó lâu dài với nghề nghiệp."
                  selectedTone="teal"
                  emptyText="Chưa có dữ liệu sở thích."
                  gridTitle="Chi tiết 6 nhóm sở thích nghề nghiệp"
                  gridIcon={Zap}
                  gridIconColorClass="text-teal-600"
                  footerLabel="Từ khóa:"
                  isItemActive={(item) => top3InterestIds.has(item.id) || (item.score >= top3InterestThreshold && item.score > 0)}
                />
              ) : activeTab === "strengths" ? (
                <DomainChartTab
                  badgeText="CORE STRENGTHS"
                  badgeIcon={Award}
                  badgeColorClass="bg-blue-500/20 text-blue-300 border-blue-500/30"
                  title="Biểu đồ kỹ năng & thế mạnh"
                  desc="Đánh giá mức độ tự tin với các năng lực học tập và làm việc."
                  highestLabel="Thế mạnh vượt trội nhất"
                  highestColorClass="text-blue-300"
                  chartBorderClass="border-blue-900/80"
                  chartBgClass="bg-gradient-to-b from-slate-950 via-blue-950/80 to-slate-950"
                  blurColor1Class="bg-blue-500/15"
                  blurColor2Class="bg-indigo-500/10"
                  gridLineColorClass="border-blue-900/60"
                  gridLabelColorClass="text-blue-400"
                  hoverShadowClass="group-hover:shadow-blue-500/30"
                  hoverBorderClass="border-blue-400/80 ring-2 ring-blue-500/10 bg-gradient-to-br from-white to-blue-50/20"
                  activeBadgeBgClass="bg-blue-100 text-blue-800"
                  activeBadgeText="ĐIỂM CAO"
                  items={strengthScores}
                  selectedTags={top3StrengthList.map((i) => `${i.shortName} (${i.score})`)}
                  selectedBannerTitle="Top kỹ năng & thế mạnh điểm cao nhất"
                  selectedBannerDesc="Các thế mạnh vượt trội đạt điểm cao nhất trong hò sơ, giúp bạn tự tin cạnh tranh trên thị trường."
                  selectedTone="slate"
                  emptyText="Chưa có dữ liệu kỹ năng."
                  gridTitle="Chi tiết 6 nhóm kỹ năng & thế mạnh trong hồ sơ"
                  gridIcon={Award}
                  gridIconColorClass="text-blue-600"
                  footerLabel="Từ khóa:"
                  isItemActive={(item) => top3StrengthIds.has(item.id) || (item.score >= top3StrengthThreshold && item.score > 0)}
                />
              ) : (
                <div className="space-y-8 animate-fade-up">
                  {/* Personal Context Overview Section */}
                  <div className="relative overflow-hidden rounded-3xl border border-slate-700 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 text-white shadow-2xl sm:p-8">
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-500/15 blur-3xl" />
                    <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

                    <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                      <div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-extrabold text-slate-300 border border-slate-700">
                          <Info size={14} />
                          PERSONAL CONTEXT
                        </span>
                        <h3 className="mt-2.5 font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
                          Bối cảnh cá nhân & định hướng
                        </h3>
                        <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                          Thông tin bối cảnh cá nhân giúp thuật toán AI cân chỉnh độ ưu tiên ngành học thực tế nhất với hoàn cảnh của bạn.
                        </p>
                      </div>
                    </div>

                    <div className="relative mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                        <div className="flex items-center gap-2.5 text-teal-300 font-bold text-xs uppercase tracking-wider mb-2">
                          <GraduationCap size={16} />
                          Trình độ học vấn
                        </div>
                        <div className="text-xl font-extrabold text-white mb-1">
                          {profile.gradeLevel}
                        </div>
                        <p className="text-xs text-slate-400 m-0">
                          Xác định lộ trình chuẩn bị thi tuyển, chọn tổ hợp môn và thời gian tích lũy kỹ năng trước khi vào đại học/nghề.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                        <div className="flex items-center gap-2.5 text-amber-300 font-bold text-xs uppercase tracking-wider mb-2">
                          <Target size={16} />
                          Mục tiêu & Ưu tiên
                        </div>
                        <div className="text-xl font-extrabold text-white mb-1 break-words">
                          {profile.goals}
                        </div>
                        <p className="text-xs text-slate-400 m-0">
                          Định hướng các nhóm ngành trọng tâm, kết nối trực tiếp với nguyện vọng nghề nghiệp mà bạn mong muốn.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                        <div className="flex items-center gap-2.5 text-rose-300 font-bold text-xs uppercase tracking-wider mb-2">
                          <Info size={16} />
                          Lưu ý & Ràng buộc
                        </div>
                        <div className="text-xl font-extrabold text-white mb-1 break-words">
                          {profile.constraints || "Không có ràng buộc đặc biệt"}
                        </div>
                        <p className="text-xs text-slate-400 m-0">
                          AI cân nhắc các rào cản tài chính, sức khỏe, địa lý để gợi ý giải pháp học tập và học bổng khả thi nhất.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50 p-6 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-800 text-white shadow-md">
                          <Sparkles size={22} />
                        </span>
                        <div>
                          <h4 className="m-0 font-display text-base font-extrabold text-slate-900">
                            Bạn muốn thay đổi hoặc bổ sung mục tiêu, lưu ý?
                          </h4>
                          <p className="m-0 text-xs text-slate-500">
                            Việc cập nhật thông tin bối cảnh mới nhất sẽ giúp hệ thống tinh chỉnh điểm phù hợp nghề nghiệp chính xác hơn.
                          </p>
                        </div>
                      </div>
                      <a href="/assessment" className="btn btn-secondary btn-sm shrink-0">
                        Cập nhật bối cảnh
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <footer className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-200/80 bg-slate-50/80 px-4 py-3 sm:px-6 sm:py-4 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="inline-block h-2 w-2 rounded-full bg-teal-500 animate-ping shrink-0" />
                <span>Dữ liệu được làm mới tự động theo bài đánh giá gần nhất</span>
              </div>
              <button onClick={closeModal} className="btn btn-primary btn-sm w-full sm:w-auto justify-center">
                Đóng cửa sổ
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

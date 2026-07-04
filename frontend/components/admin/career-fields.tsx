import type { CareerPath } from "@/lib/types";

type CareerFieldsProps = {
  career?: Pick<CareerPath, "title" | "cluster" | "summary" | "subjects" | "jobSkills" | "majors" | "activities" | "jobTasks">;
};

function joinList(values: string[]) {
  return values.join(", ");
}

export function CareerFields({ career }: CareerFieldsProps) {
  return (
    <>
      <div className="grid gap-1.5">
        <label className="field-label text-xs">Tên nghề</label>
        <input className="field text-sm py-1.5 min-h-[36px]" name="title" defaultValue={career?.title ?? ""} required />
      </div>
      <div className="grid gap-1.5">
        <label className="field-label text-xs">Nhóm nghề</label>
        <input className="field text-sm py-1.5 min-h-[36px]" name="cluster" defaultValue={career?.cluster ?? ""} required />
      </div>
      <div className="grid gap-1.5 lg:col-span-2">
        <label className="field-label text-xs">Tóm tắt</label>
        <textarea className="field text-sm py-1.5 min-h-[60px] resize-y" name="summary" defaultValue={career?.summary ?? ""} required />
      </div>
      <div className="grid gap-1.5">
        <label className="field-label text-xs">Môn học</label>
        <input className="field text-sm py-1.5 min-h-[36px]" name="subjects" defaultValue={career ? joinList(career.subjects) : ""} />
      </div>
      <div className="grid gap-1.5">
        <label className="field-label text-xs">Kỹ năng nghề nghiệp</label>
        <input className="field text-sm py-1.5 min-h-[36px]" name="jobSkills" defaultValue={career ? joinList(career.jobSkills) : ""} />
      </div>
      <div className="grid gap-1.5">
        <label className="field-label text-xs">Ngành học</label>
        <input className="field text-sm py-1.5 min-h-[36px]" name="majors" defaultValue={career ? joinList(career.majors) : ""} />
      </div>
      <div className="grid gap-1.5 lg:col-span-2">
        <label className="field-label text-xs">Nhiệm vụ công việc</label>
        <input className="field text-sm py-1.5 min-h-[36px]" name="jobTasks" defaultValue={career ? joinList(career.jobTasks) : ""} />
      </div>
      <div className="grid gap-1.5 lg:col-span-2">
        <label className="field-label text-xs">Hoạt động trải nghiệm</label>
        <input className="field text-sm py-1.5 min-h-[36px]" name="activities" defaultValue={career ? joinList(career.activities) : ""} />
      </div>
    </>
  );
}

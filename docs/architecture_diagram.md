# Architecture Diagram - Gate G2

Tài liệu này mô tả kiến trúc component và data flow chính của AI Career Compass MVP.

## 1. Component Architecture

![Component Architecture](assets/architecture_components.svg)

Sơ đồ component cho thấy hệ thống có 4 lớp chính:

- **User layer:** học sinh hoặc admin thao tác với web app.
- **Frontend:** Next.js App Router, React, TypeScript và Tailwind CSS. Các màn hình chính gồm login/register, assessment, profile, explore/career detail, AI Career Coach và admin views.
- **Backend:** FastAPI xử lý auth, assessment, profile, advisor, matching engine và advisor agent.
- **Data/AI layer:** dữ liệu demo/mock data hiện tại, schema PostgreSQL/Prisma cho hướng tích hợp DB, career database, profile người dùng và OpenAI API cho LLM.

```mermaid
flowchart LR
    User[Student / Admin] --> FE[Next.js Frontend]

    subgraph Frontend
        AuthUI[Auth Pages]
        AssessmentUI[Assessment UI]
        ProfileUI[Profile UI]
        ExploreUI[Explore / Career Detail]
        AdvisorUI[AI Career Coach UI]
        AdminUI[Admin Views]
    end

    FE --> AuthUI
    FE --> AssessmentUI
    FE --> ProfileUI
    FE --> ExploreUI
    FE --> AdvisorUI
    FE --> AdminUI

    FE --> API[FastAPI Backend]

    subgraph Backend
        AuthRouter[Auth Router]
        AssessmentRouter[Assessment Router]
        ProfileRouter[Profile Router]
        AdvisorRouter[Advisor Router]
        MatchingEngine[Career Matching Engine]
        AdvisorAgent[Advisor Agent]
    end

    API --> AuthRouter
    API --> AssessmentRouter
    API --> ProfileRouter
    API --> AdvisorRouter
    AssessmentRouter --> ProfileBuilder[Profile Builder]
    ProfileRouter --> MatchingEngine
    AdvisorRouter --> MatchingEngine
    AdvisorRouter --> AdvisorAgent

    Data[(Mock Data / PostgreSQL Schema)]
    CareerDB[(Career Database)]
    OpenAI[OpenAI API]

    ProfileBuilder --> Data
    MatchingEngine --> CareerDB
    MatchingEngine --> Data
    AdvisorAgent --> Data
    AdvisorAgent --> OpenAI
```

## 2. Main Data Flow

![Data Flow](assets/architecture_dataflow.svg)

Luồng chính của học sinh:

1. Học sinh nhập mục tiêu, bối cảnh và trả lời assessment.
2. Frontend gửi dữ liệu assessment sang backend.
3. Backend validate câu trả lời, chuẩn hóa điểm từ 1 đến 5.
4. Hệ thống tạo `CareerProfile` gồm RIASEC, môn học, sở thích, kỹ năng và giá trị nghề nghiệp.
5. Matching engine so sánh profile với career database.
6. Frontend hiển thị top nghề, fit score và lý do phù hợp.
7. Học sinh mở chi tiết nghề để xem mô tả, ngành học, nhiệm vụ công việc và hoạt động trải nghiệm.
8. Học sinh hỏi AI Career Coach.
9. Advisor agent build context từ profile và top career matches.
10. Backend gửi context tới OpenAI API.
11. AI trả về phản hồi cá nhân hóa cho học sinh.

```mermaid
sequenceDiagram
    actor Student
    participant FE as Next.js Frontend
    participant BE as FastAPI Backend
    participant Profile as Profile Builder
    participant Match as Matching Engine
    participant Data as Career Data
    participant Agent as Advisor Agent
    participant AI as OpenAI API

    Student->>FE: Fill assessment form
    FE->>BE: POST /assessment/submit
    BE->>BE: Validate and normalize answers
    BE->>Profile: Build career profile
    Profile->>Data: Save/update profile
    Profile-->>BE: CareerProfile
    BE-->>FE: Redirect to profile page

    Student->>FE: Open Explore page
    FE->>Match: Get profile-based matches
    Match->>Data: Read career database
    Match-->>FE: Top careers + fit scores + reasons

    Student->>FE: Open career detail
    FE->>Data: Read career detail
    Data-->>FE: Summary + majors + activities + jobTasks

    Student->>FE: Ask AI Career Coach
    FE->>BE: POST /advisor/chat
    BE->>Agent: Build prompt context
    Agent->>Data: Read profile + career matches
    Agent->>AI: Send question + context
    AI-->>Agent: Personalized answer
    Agent-->>BE: Safe advisor response
    BE-->>FE: AI response
```

## 3. Notes For Gate G2

- User flow chính đã có input, xử lý và output có ý nghĩa.
- Matching hiện tại chạy bằng rule-based scoring từ profile và career database.
- AI Career Coach dùng profile + top matches làm context để gọi LLM.
- Data layer hiện tại vẫn có mock data trong app, đồng thời project đã có Prisma/PostgreSQL schema để mở rộng sang DB thật.

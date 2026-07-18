# Portfolio Project Docs Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm route `/docs` vào portfolio để giám khảo hackathon và khách hàng đọc tám tài liệu VéĐi viết mới hoàn toàn.

**Architecture:** `DocsPage` đọc manifest typed, chọn tài liệu qua `?doc=`, tải Markdown tĩnh từ `public/project-docs`, rồi render bằng `react-markdown` + `remark-gfm`. `DocsSidebar` chỉ phụ trách nhóm/chọn tài liệu; typography dùng namespace `.project-docs-markdown`; `/baocao` không đổi.

**Tech Stack:** React 18, TypeScript, React Router 6, React Markdown 10, remark-gfm, Tailwind CSS 3, Vitest, Testing Library, Vite 5.

## Global Constraints

- Đối tượng chính: giám khảo hackathon và khách hàng tiềm năng.
- Nội dung viết mới hoàn toàn, không copy file/câu chữ từ `portfolio/public/docs`, `portfolio/public/baocao.md` hoặc tài liệu gốc của repo.
- Dùng thông tin đúng với trạng thái hiện tại; phân biệt demo công khai, pilot có credentials và hướng phát triển.
- Không tuyên bố đã có thanh toán, giữ ghế, PSTN/SIP, dữ liệu chuyến thật hoặc tích hợp production nếu chưa được kiểm chứng.
- Raw HTML không được bật trong Markdown renderer.
- Không sửa/xóa route, tài liệu hoặc hành vi của `/baocao`.
- Route giữ palette trung tính, một màu nhấn xanh lá, tương phản WCAG AA.
- `portfolio/` là Git repo riêng. Mọi implementation commit nằm trên branch `feat/vedi-project-docs` của repo này; không stage hoặc sửa file thuộc repo cha.

## File Map

- Create `portfolio/src/data/project-documents.ts`: type, manifest, lookup, grouping.
- Create `portfolio/src/data/project-documents.test.ts`: contract manifest.
- Create `portfolio/src/hooks/use-markdown-document.ts`: fetch lifecycle và stale-request guard.
- Create `portfolio/src/hooks/use-markdown-document.test.tsx`: success/error/refetch tests.
- Create `portfolio/src/components/docs/DocsSidebar.tsx`: grouped accessible document navigation.
- Create `portfolio/src/pages/Docs.tsx`: route shell, query selection, mobile drawer, Markdown renderer, lightbox, scroll-to-top.
- Create `portfolio/src/pages/Docs.test.tsx`: page behavior and deep-link coverage.
- Create eight files under `portfolio/public/project-docs/`: customer-facing VéĐi content.
- Modify `portfolio/src/App.tsx`: register `/docs` above catch-all.
- Modify `portfolio/src/components/Navbar.tsx`: add desktop/mobile `/docs` discovery link while preserving `/baocao`.
- Modify `portfolio/src/index.css`: add isolated Markdown typography.

---

### Task 1: Typed project-document manifest

**Files:**
- Create: `portfolio/src/data/project-documents.test.ts`
- Create: `portfolio/src/data/project-documents.ts`

**Interfaces:**
- Produces: `ProjectDocument`, `PROJECT_DOCUMENTS`, `DEFAULT_PROJECT_DOCUMENT_ID`, `getProjectDocument(id)`, `groupProjectDocuments(documents)`.
- Consumed by: `DocsSidebar`, `DocsPage`, content integrity checks.

- [ ] **Step 1: Write failing manifest tests**

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROJECT_DOCUMENT_ID,
  PROJECT_DOCUMENTS,
  getProjectDocument,
  groupProjectDocuments,
} from "./project-documents";

describe("project document manifest", () => {
  it("defines eight unique documents and a valid default", () => {
    expect(PROJECT_DOCUMENTS).toHaveLength(8);
    expect(new Set(PROJECT_DOCUMENTS.map((document) => document.id)).size).toBe(8);
    expect(getProjectDocument(DEFAULT_PROJECT_DOCUMENT_ID).id).toBe("tong-quan-vedi");
  });

  it("falls back to the default document for unknown ids", () => {
    expect(getProjectDocument("khong-ton-tai").id).toBe(DEFAULT_PROJECT_DOCUMENT_ID);
    expect(getProjectDocument(null).id).toBe(DEFAULT_PROJECT_DOCUMENT_ID);
  });

  it("preserves the three editorial groups in order", () => {
    expect(groupProjectDocuments(PROJECT_DOCUMENTS).map(({ group }) => group)).toEqual([
      "Khám phá sản phẩm",
      "Giá trị & trải nghiệm",
      "Sẵn sàng triển khai",
    ]);
  });
});
```

- [ ] **Step 2: Run test and verify expected failure**

Run: `cd portfolio && npm test -- src/data/project-documents.test.ts`

Expected: FAIL because `./project-documents` does not exist.

- [ ] **Step 3: Implement manifest**

```ts
export type ProjectDocument = {
  id: string;
  label: string;
  path: string;
  group: "Khám phá sản phẩm" | "Giá trị & trải nghiệm" | "Sẵn sàng triển khai";
};

export const PROJECT_DOCUMENTS: ProjectDocument[] = [
  { id: "tong-quan-vedi", label: "Tổng quan VéĐi", path: "/project-docs/tong-quan-vedi.md", group: "Khám phá sản phẩm" },
  { id: "bai-toan-thi-truong", label: "Bài toán thị trường", path: "/project-docs/bai-toan-thi-truong.md", group: "Khám phá sản phẩm" },
  { id: "cach-vedi-hoat-dong", label: "Cách VéĐi hoạt động", path: "/project-docs/cach-vedi-hoat-dong.md", group: "Khám phá sản phẩm" },
  { id: "tinh-nang-noi-bat", label: "Tính năng nổi bật", path: "/project-docs/tinh-nang-noi-bat.md", group: "Giá trị & trải nghiệm" },
  { id: "kich-ban-demo", label: "Kịch bản demo", path: "/project-docs/kich-ban-demo.md", group: "Giá trị & trải nghiệm" },
  { id: "an-toan-va-quyen-rieng-tu", label: "An toàn & quyền riêng tư", path: "/project-docs/an-toan-va-quyen-rieng-tu.md", group: "Giá trị & trải nghiệm" },
  { id: "kien-truc-de-hieu", label: "Kiến trúc dễ hiểu", path: "/project-docs/kien-truc-de-hieu.md", group: "Sẵn sàng triển khai" },
  { id: "lo-trinh-pilot", label: "Lộ trình pilot", path: "/project-docs/lo-trinh-pilot.md", group: "Sẵn sàng triển khai" },
];

export const DEFAULT_PROJECT_DOCUMENT_ID = "tong-quan-vedi";

export function getProjectDocument(id: string | null): ProjectDocument {
  return PROJECT_DOCUMENTS.find((document) => document.id === id) ?? PROJECT_DOCUMENTS[0];
}

export function groupProjectDocuments(documents: ProjectDocument[]) {
  const groups = new Map<string, ProjectDocument[]>();
  for (const document of documents) {
    const items = groups.get(document.group) ?? [];
    items.push(document);
    groups.set(document.group, items);
  }
  return Array.from(groups, ([group, items]) => ({ group, items }));
}
```

- [ ] **Step 4: Run test and verify pass**

Run: `cd portfolio && npm test -- src/data/project-documents.test.ts`

Expected: 3 tests PASS.

- [ ] **Step 5: Checkpoint**

Run: `rtk git status --short portfolio/src/data`

Expected: only two new Task 1 files under `portfolio/src/data`; commit them on `feat/vedi-project-docs` after tests pass.

---

### Task 2: Isolated Markdown fetch hook

**Files:**
- Create: `portfolio/src/hooks/use-markdown-document.test.tsx`
- Create: `portfolio/src/hooks/use-markdown-document.ts`

**Interfaces:**
- Consumes: static Markdown URL.
- Produces: `useMarkdownDocument(path): { content: string; loading: boolean; error: string | null }`.
- Consumed by: `DocsPage`.

- [ ] **Step 1: Write failing hook tests**

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMarkdownDocument } from "./use-markdown-document";

describe("useMarkdownDocument", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads markdown text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("# VéĐi") }));
    const { result } = renderHook(() => useMarkdownDocument("/project-docs/tong-quan-vedi.md"));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.content).toBe("# VéĐi"));
    expect(result.current.error).toBeNull();
  });

  it("exposes an HTTP error without stale content", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const { result } = renderHook(() => useMarkdownDocument("/project-docs/missing.md"));
    await waitFor(() => expect(result.current.error).toBe("Không tải được tài liệu (404)"));
    expect(result.current.content).toBe("");
  });
});
```

- [ ] **Step 2: Run test and verify expected failure**

Run: `cd portfolio && npm test -- src/hooks/use-markdown-document.test.tsx`

Expected: FAIL because hook does not exist.

- [ ] **Step 3: Implement hook with cancellation guard**

```ts
import { useEffect, useState } from "react";

type MarkdownDocumentState = {
  content: string;
  loading: boolean;
  error: string | null;
};

export function useMarkdownDocument(path: string): MarkdownDocumentState {
  const [state, setState] = useState<MarkdownDocumentState>({ content: "", loading: true, error: null });

  useEffect(() => {
    let active = true;
    setState({ content: "", loading: true, error: null });

    fetch(path)
      .then((response) => {
        if (!response.ok) throw new Error(`Không tải được tài liệu (${response.status})`);
        return response.text();
      })
      .then((content) => {
        if (active) setState({ content, loading: false, error: null });
      })
      .catch((error: Error) => {
        if (active) setState({ content: "", loading: false, error: error.message });
      });

    return () => {
      active = false;
    };
  }, [path]);

  return state;
}
```

- [ ] **Step 4: Run hook tests**

Run: `cd portfolio && npm test -- src/hooks/use-markdown-document.test.tsx`

Expected: 2 tests PASS.

- [ ] **Step 5: Checkpoint**

Run: `rtk git status --short portfolio/src/hooks`

Expected: two new Task 2 files; commit them on `feat/vedi-project-docs` after tests pass.

---

### Task 3: Docs navigation and page shell

**Files:**
- Create: `portfolio/src/components/docs/DocsSidebar.tsx`
- Create: `portfolio/src/pages/Docs.test.tsx`
- Create: `portfolio/src/pages/Docs.tsx`

**Interfaces:**
- Consumes: manifest functions from Task 1 and `useMarkdownDocument` from Task 2.
- Produces: default export `DocsPage`; `DocsSidebar({ documents, activeId, onSelect })`.

- [ ] **Step 1: Write failing page behavior tests**

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import DocsPage from "./Docs";

describe("DocsPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads default document and changes selection", async () => {
    const fetchMock = vi.fn().mockImplementation((path: string) =>
      Promise.resolve({ ok: true, text: () => Promise.resolve(`# ${path}`) }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("scrollTo", vi.fn());

    render(<MemoryRouter initialEntries={["/docs"]}><DocsPage /></MemoryRouter>);
    await screen.findByRole("heading", { name: "/project-docs/tong-quan-vedi.md" });
    fireEvent.click(screen.getAllByRole("button", { name: "Kiến trúc dễ hiểu" })[0]);
    await screen.findByRole("heading", { name: "/project-docs/kien-truc-de-hieu.md" });
    expect(fetchMock).toHaveBeenLastCalledWith("/project-docs/kien-truc-de-hieu.md");
  });

  it("honors deep links and exposes load failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    render(<MemoryRouter initialEntries={["/docs?doc=kien-truc-de-hieu"]}><DocsPage /></MemoryRouter>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Không tải được tài liệu (503)");
    expect(screen.getAllByText("Kiến trúc dễ hiểu").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run page tests and verify expected failure**

Run: `cd portfolio && npm test -- src/pages/Docs.test.tsx`

Expected: FAIL because `Docs.tsx` does not exist.

- [ ] **Step 3: Implement grouped sidebar**

```tsx
import type { ProjectDocument } from "@/data/project-documents";
import { groupProjectDocuments } from "@/data/project-documents";
import { cn } from "@/lib/utils";

type DocsSidebarProps = {
  documents: ProjectDocument[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
};

const DocsSidebar = ({ documents, activeId, onSelect, className }: DocsSidebarProps) => (
  <nav className={cn("flex flex-col gap-7 p-4", className)} aria-label="Tài liệu dự án VéĐi">
    {groupProjectDocuments(documents).map(({ group, items }) => (
      <section key={group} aria-labelledby={`docs-group-${group}`}>
        <h2 id={`docs-group-${group}`} className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
          {group}
        </h2>
        <ul className="space-y-1">
          {items.map((document) => (
            <li key={document.id}>
              <button
                type="button"
                onClick={() => onSelect(document.id)}
                aria-current={document.id === activeId ? "page" : undefined}
                className={cn(
                  "w-full rounded-md px-3 py-2.5 text-left text-sm leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                  document.id === activeId ? "bg-emerald-950 font-semibold text-white" : "text-slate-700 hover:bg-emerald-50",
                )}
              >
                {document.label}
              </button>
            </li>
          ))}
        </ul>
      </section>
    ))}
  </nav>
);

export default DocsSidebar;
```

- [ ] **Step 4: Implement page shell**

Create `portfolio/src/pages/Docs.tsx` with:

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, BookOpen, Menu } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link, useSearchParams } from "react-router-dom";
import DocsSidebar from "@/components/docs/DocsSidebar";
import ImageLightbox from "@/components/ImageLightbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DEFAULT_PROJECT_DOCUMENT_ID,
  PROJECT_DOCUMENTS,
  getProjectDocument,
} from "@/data/project-documents";
import { useMarkdownDocument } from "@/hooks/use-markdown-document";

const DocsPage = () => {
  const [params, setParams] = useSearchParams();
  const activeDocument = getProjectDocument(params.get("doc"));
  const { content, loading, error } = useMarkdownDocument(activeDocument.path);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);

  const selectDocument = useCallback((id: string) => {
    setParams(id === DEFAULT_PROJECT_DOCUMENT_ID ? {} : { doc: id }, { replace: true });
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setParams]);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => setShowTop(!entry.isIntersecting));
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-950">
      <div ref={topSentinelRef} className="pointer-events-none absolute left-0 top-[420px] h-px w-px" aria-hidden="true" />
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex min-h-[68px] items-center gap-3 px-4 md:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2 text-sm text-slate-600 transition-colors hover:text-emerald-800">
            <ArrowLeft size={17} aria-hidden="true" />
            <span className="hidden sm:inline">Portfolio</span>
          </Link>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button type="button" className="rounded-md border border-slate-300 p-2 text-slate-700 lg:hidden" aria-label="Mở danh sách tài liệu">
                <Menu size={20} />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(100vw-2rem,21rem)] overflow-y-auto p-0">
              <SheetHeader className="border-b border-slate-200 px-5 py-4 text-left">
                <SheetTitle className="flex items-center gap-2"><BookOpen size={18} /> VéĐi Docs</SheetTitle>
              </SheetHeader>
              <DocsSidebar documents={PROJECT_DOCUMENTS} activeId={activeDocument.id} onSelect={selectDocument} />
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{activeDocument.label}</p>
            <p className="truncate text-xs text-slate-500">{activeDocument.group}</p>
          </div>
        </div>
      </header>

      <div className="flex pt-[68px]">
        <aside className="fixed inset-y-[68px] left-0 hidden w-72 overflow-y-auto border-r border-slate-200 bg-white lg:block">
          <DocsSidebar documents={PROJECT_DOCUMENTS} activeId={activeDocument.id} onSelect={selectDocument} />
        </aside>
        <main className="min-w-0 flex-1 lg:ml-72">
          <div className="mx-auto max-w-4xl px-4 py-8 pb-20 md:px-8 md:py-12">
            {loading && <p className="py-16 text-center text-sm text-slate-500">Đang tải tài liệu…</p>}
            {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-700">{error}</p>}
            {!loading && !error && (
              <article
                className="project-docs-markdown"
                onClick={(event) => {
                  const target = event.target as HTMLElement;
                  if (target.tagName === "IMG") setLightboxSrc((target as HTMLImageElement).src);
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </article>
            )}
          </div>
        </main>
      </div>

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      {showTop && (
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-6 right-6 rounded-full bg-emerald-950 p-3 text-white shadow-lg" aria-label="Lên đầu trang">
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
};

export default DocsPage;
```

- [ ] **Step 5: Run focused page tests**

Run: `cd portfolio && npm test -- src/pages/Docs.test.tsx`

Expected: 2 tests PASS; no unhandled fetch or Router errors.

- [ ] **Step 6: Run all new unit tests**

Run: `cd portfolio && npm test -- src/data/project-documents.test.ts src/hooks/use-markdown-document.test.tsx src/pages/Docs.test.tsx`

Expected: 7 tests PASS.

- [ ] **Step 7: Checkpoint**

Run: `rtk git status --short portfolio/src/components/docs portfolio/src/pages portfolio/src/hooks portfolio/src/data`

Expected: new docs files only; commit them on `feat/vedi-project-docs` after tests pass.

---

### Task 4: Eight original customer-facing Markdown documents

**Files:**
- Create: `portfolio/public/project-docs/tong-quan-vedi.md`
- Create: `portfolio/public/project-docs/bai-toan-thi-truong.md`
- Create: `portfolio/public/project-docs/cach-vedi-hoat-dong.md`
- Create: `portfolio/public/project-docs/tinh-nang-noi-bat.md`
- Create: `portfolio/public/project-docs/kich-ban-demo.md`
- Create: `portfolio/public/project-docs/an-toan-va-quyen-rieng-tu.md`
- Create: `portfolio/public/project-docs/kien-truc-de-hieu.md`
- Create: `portfolio/public/project-docs/lo-trinh-pilot.md`

**Interfaces:**
- Consumes: paths from `PROJECT_DOCUMENTS`.
- Produces: eight static HTTP resources rendered by `DocsPage`.

- [ ] **Step 1: Create eight Markdown files with original copy**

Use following complete editorial payloads. Preserve headings and status language; expand only with verified project facts.

`tong-quan-vedi.md`:

```md
# VéĐi — trợ lý cuộc gọi đặt vé xe

VéĐi giúp nhà xe biến cuộc trò chuyện tiếng Việt thành phiếu đặt vé rõ ràng, có nguồn kiểm chứng và vẫn nằm dưới quyền kiểm soát của nhân viên.

## Một câu mô tả

Hành khách nói như bình thường. Hệ thống nhận diện nội dung, điền từng trường đặt vé, chỉ ra câu nói làm bằng chứng và nhắc phần còn thiếu. Nhân viên có thể trả lời trực tiếp, giao một lượt cho Agent hoặc giành lại quyền bất kỳ lúc nào.

## Giá trị chính

| Đối tượng | Kết quả mong đợi |
|---|---|
| Hành khách | Ít phải lặp lại thông tin, vẫn được xác nhận trước khi tạo booking |
| Nhân viên | Theo dõi nhiều dữ kiện trong một màn hình, sửa và khóa trường quan trọng |
| Nhà xe | Quy trình đồng nhất hơn, có dấu vết quyết định và nền tảng để đo hiệu suất |

## Trạng thái hiện tại

Phiên bản hackathon chạy được bằng hai màn hình: người gọi và bàn nhân viên. Demo công khai luôn có luồng text/câu mẫu; voice qua trình duyệt là fallback. Khi có credentials, kiến trúc hỗ trợ LiveKit cho media hai thiết bị, VALSEA cho tiếng Việt và worker Agent chạy riêng.

> VéĐi hiện là demo có kiểm soát, chưa phải hệ thống bán vé production. Chưa có thanh toán, giữ ghế thật, PSTN/SIP hoặc gửi tin tự động.

## Điều giám khảo nên quan sát

1. Final transcript mới cập nhật phiếu.
2. Mỗi dữ kiện có câu nói nguồn.
3. Human mode không cho Agent tự phát lời.
4. Nhân viên có thể takeover mà không mất phiên.
5. Booking chỉ đi qua bước đọc lại và xác nhận rõ ràng.
```

`bai-toan-thi-truong.md`:

```md
# Bài toán VéĐi giải quyết

Đặt vé qua điện thoại vẫn phù hợp với hành khách quen nói trực tiếp, nhưng nhân viên phải vừa nghe, vừa hỏi, vừa nhập nhiều trường trong thời gian ngắn.

## Ba điểm nghẽn

### Thông tin phân tán

Điểm đi, điểm đến, ngày, giờ, số vé, tên, số điện thoại và điểm đón/trả thường xuất hiện không theo thứ tự. Một chi tiết bị nghe nhầm có thể kéo theo cuộc gọi lại hoặc xử lý thủ công.

### Tự động hóa thiếu niềm tin

Một chatbot trả lời trôi chảy chưa đồng nghĩa với booking đúng. Nhà xe cần biết dữ kiện đến từ đâu, ai đã sửa, ai được quyền xác nhận và điều gì xảy ra khi provider lỗi.

### Nhân viên khó can thiệp đúng lúc

Tự động hoàn toàn tạo rủi ro; thủ công hoàn toàn không giảm tải. Bài toán phù hợp hơn là chia quyền theo phiên: máy hỗ trợ phần lặp lại, con người giữ quyền quyết định.

## Cơ hội

VéĐi tạo lớp vận hành giữa cuộc gọi và hệ thống bán vé. Lớp này chuẩn hóa transcript thành dữ liệu, giữ bằng chứng, gợi ý câu hỏi tiếp theo và chuẩn bị booking draft. Khi kết nối catalog/ERP đã kiểm chứng, nhà xe có thể giảm thao tác mà không giao quyền xác nhận cho mô hình ngôn ngữ.

## Thước đo pilot đề xuất

- thời gian xử lý trung bình mỗi cuộc gọi;
- tỷ lệ trường được điền đúng ngay lần đầu;
- số lần nhân viên phải sửa hoặc takeover;
- tỷ lệ hoàn thành booking draft;
- lỗi trùng booking và sự cố fallback.
```

`cach-vedi-hoat-dong.md`:

```md
# Cách VéĐi hoạt động

## Hành trình sáu bước

1. **Bắt đầu phiên:** người gọi và nhân viên dùng cùng mã phiên demo.
2. **Nhận câu nói:** hệ thống hiển thị bản tạm để theo dõi, nhưng chưa dùng nó làm dữ kiện.
3. **Chốt transcript:** chỉ câu final của hành khách mới được phân tích.
4. **Cập nhật phiếu:** dữ kiện hợp lệ đi vào đúng trường cùng trích dẫn nguồn và độ tin cậy.
5. **Hỏi phần thiếu:** nhân viên duyệt gợi ý hoặc bật Agent cho lượt trả lời tự động.
6. **Đọc lại và xác nhận:** hệ thống tóm tắt; booking chỉ tiến tiếp sau hành động xác nhận hợp lệ.

## Human và Auto

**Human** là mặc định. Agent nghe, ghi transcript và chuẩn bị gợi ý nhưng không tự nói. **Auto** cho phép Agent tạo câu hỏi tiếp theo trong phạm vi phiên. Một thao tác takeover đưa quyền trả lời về nhân viên mà vẫn giữ transcript, phiếu và bằng chứng.

## Khi dịch vụ ngoài gặp lỗi

Giao diện giữ dữ liệu final gần nhất, ghi rõ trạng thái suy giảm và chuyển về text/câu mẫu hoặc Human mode. VéĐi không hiển thị thông báo thành công khi database, inventory hoặc provider chưa xác nhận.
```

`tinh-nang-noi-bat.md`:

```md
# Tính năng nổi bật

## Transcript realtime có ranh giới final

Bản tạm giúp nhân viên theo dõi nhịp nói. Bản final mới có quyền cập nhật booking draft, giảm nguy cơ dữ liệu đổi liên tục theo từng âm tiết.

## Phiếu đặt vé tự điền

VéĐi nhận diện hành trình, thời gian, số lượng, thông tin hành khách và điểm đón/trả. Trường chưa đủ được đánh dấu để hỏi tiếp, không tự đoán.

## Evidence cho từng trường

Mỗi giá trị giữ liên kết tới câu final của hành khách. Nhân viên thấy được “vì sao hệ thống điền như vậy”, sửa khi cần và khóa trường đã kiểm tra.

## Human/Auto và takeover

Nhân viên quyết định Agent được nói hay không. Chuyển chế độ không tạo cuộc gọi mới, không xóa dữ liệu và được thiết kế để lưu dấu vết vận hành.

## Confirmation gate

Agent không có quyền tự xác nhận booking. Hệ thống kiểm tra trường bắt buộc, đọc lại nội dung và yêu cầu xác nhận rõ ràng trước bước phát hành mã.

## Hai cấu hình trải nghiệm

| Cấu hình | Dùng khi | Cam kết đúng |
|---|---|---|
| Demo công khai | Trình diễn không credentials | Text/câu mẫu chạy; browser voice chỉ là fallback có nhãn |
| Pilot có credentials | Kiểm thử hai thiết bị thật | LiveKit media, VALSEA voice path, persistence sau smoke test |
```

`kich-ban-demo.md`:

```md
# Kịch bản demo cho giám khảo

## Chuẩn bị

Mở `/staff?session=DEMO42` trên laptop và `/call?session=DEMO42` ở tab thứ hai. Khi chưa cấu hình LiveKit, hai tab cần cùng trình duyệt.

## Demo Human-in-the-loop

1. Giữ chế độ **Nhân viên**.
2. Từ màn hình người gọi, gửi: “Đặt hai vé từ Sài Gòn đi Đà Lạt ngày 24 tháng 7 lúc 22 giờ.”
3. Quan sát transcript final, trường tự điền và bằng chứng dưới từng trường.
4. Dùng gợi ý trả lời đã được nhân viên duyệt.
5. Gửi tiếp tên, số điện thoại, điểm đón và điểm trả.
6. Sửa một trường để trình diễn quyền kiểm soát của nhân viên.
7. Đọc summary rồi xác nhận một lần.

## Demo Auto

Tạo mã phiên khác, bật Agent tự động và gửi lại thông tin theo hai lượt. Chuyển về Human rồi gửi thêm một câu: Agent không được tự trả lời sau takeover.

## Bốn câu hỏi giám khảo nên thử

- Nếu nói thiếu ngày hoặc giờ, hệ thống hỏi gì?
- Nếu nhân viên sửa field, dữ liệu có bị Agent ghi đè không?
- Nếu gửi lại cùng xác nhận, có tạo mã thứ hai không?
- Nếu voice không khả dụng, demo còn hoàn thành bằng text không?

> Nhãn “mô phỏng cục bộ” nghĩa là chưa có audio truyền qua mạng. Chỉ gọi “VALSEA đang nghe” sau khi worker báo sẵn sàng.
```

`an-toan-va-quyen-rieng-tu.md`:

```md
# An toàn và quyền riêng tư

VéĐi thiết kế AI như trợ lý vận hành, không phải chủ thể quyết định độc lập.

## Quyền hạn rõ ràng

- Hành khách cung cấp và sửa thông tin của chính phiên.
- Nhân viên theo dõi, takeover, khóa field và xác nhận khi có quyền phù hợp.
- Agent tạo transcript, đề xuất dữ liệu và câu trả lời; không tự phát hành booking.

## Dữ liệu tối thiểu

Demo công khai không cần lưu dữ liệu hành khách trên server. Pilot chỉ nên giữ final transcript, booking snapshot và audit cần thiết. Raw audio mặc định không lưu; ghi âm cần consent riêng, thời hạn lưu và đường xóa dữ liệu.

## Secret và định danh

API key, database URL và token ký luôn ở server hoặc worker. Không đưa secret vào biến `NEXT_PUBLIC_*`, URL, log hoặc ảnh chụp demo. Mã phiên hackathon giúp ghép hai màn hình nhưng chưa thay thế đăng nhập.

## Trước pilot thật

Nhà xe cần staff authentication, invitation đã ký cho người gọi, rate limit, phân quyền session, chính sách retention và kiểm thử xóa/ẩn danh. Số điện thoại phải được che trong log và báo cáo hỗ trợ.

## Nguyên tắc thất bại an toàn

Khi STT, LLM, TTS, mạng hoặc persistence lỗi, phiên quay về Human/text path. Booking giữ trạng thái chưa xác nhận; giao diện không bịa trạng thái ghế, giá, thanh toán hoặc gửi vé.
```

`kien-truc-de-hieu.md`:

```md
# Kiến trúc dễ hiểu

## Năm khối chính

| Khối | Vai trò |
|---|---|
| Màn hình người gọi | Thu mic hoặc text, phát câu trả lời, hiển thị trạng thái phiên |
| Bàn nhân viên | Transcript, gợi ý, phiếu đặt vé, evidence và quyền Human/Auto |
| LiveKit | Chuyển audio và event giữa hai thiết bị trong cấu hình pilot |
| Voice Agent worker | Kết nối VALSEA, điều phối lượt nói và áp dụng giới hạn Agent |
| Booking core + database | Chuẩn hóa dữ kiện, kiểm tra confirmation, chống trùng và lưu audit |

## Hai luồng chạy song song

**Luồng audio** mang tiếng nói giữa người gọi, LiveKit và worker. **Luồng sự kiện** mang transcript, booking snapshot, status và lệnh nhân viên. Tách hai luồng giúp giao diện vẫn hoạt động bằng text khi voice suy giảm.

## Vì sao worker chạy riêng

Một cuộc gọi cần kết nối WebSocket lâu dài. Web trên Vercel phục vụ giao diện, API ngắn và token; worker chạy trên môi trường phù hợp cho tiến trình liên tục. Secret provider không đi vào browser.

## Vai trò của AI

VALSEA xử lý tiếng Việt trên voice path pilot. Mô hình ngôn ngữ đề xuất câu hỏi hoặc câu trả lời khi Auto được bật. Logic xác định trong booking core mới quyết định field hợp lệ, bằng chứng và điều kiện xác nhận.
```

`lo-trinh-pilot.md`:

```md
# Lộ trình từ demo tới pilot

## Giai đoạn 1 — Demo hackathon

Mục tiêu: chứng minh hành trình hai phía, final-only extraction, evidence, Human/Auto, takeover và confirmation gate. Dữ liệu mẫu; text/câu mẫu luôn dùng được.

## Giai đoạn 2 — Pilot có credentials

Mục tiêu: kiểm thử cuộc gọi hai thiết bị qua LiveKit, VALSEA voice path, worker Agent riêng và persistence có kiểm soát. Điều kiện vào pilot gồm consent, authentication, token scope, rate limit, migration được review, secret scan và smoke test reconnect.

## Giai đoạn 3 — Kết nối vận hành nhà xe

Mục tiêu: tích hợp catalog tuyến/chuyến/giá, phân công cuộc gọi, dashboard và audit theo vai trò. Inventory thật chỉ được hiển thị sau khi API đối tác có hợp đồng dữ liệu và cơ chế timeout/fallback rõ.

## Giai đoạn 4 — Mở rộng kênh

PSTN/SIP, thanh toán, giữ ghế và gửi tin là các dự án riêng. Mỗi kênh cần kiểm chứng provider, idempotency, consent, rollback và trách nhiệm hỗ trợ trước khi quảng bá.

## Exit criteria cho pilot

- hoàn thành luồng hai thiết bị với dữ liệu test đã consent;
- reconnect không tạo booking trùng;
- Agent ngừng nói ngay sau takeover;
- log che PII và không chứa secret;
- provider lỗi vẫn hoàn thành được bằng Human/text;
- mọi claim demo khớp runtime đang bật.
```

- [ ] **Step 2: Verify manifest paths resolve to files**

Run:

```bash
cd portfolio
for path in public/project-docs/*.md; do test -s "$path" || exit 1; done
test "$(find public/project-docs -name '*.md' | wc -l | tr -d ' ')" = "8"
```

Expected: exit 0 and exactly 8 non-empty Markdown files.

- [ ] **Step 3: Run copy-boundary scan**

Run:

```bash
rtk rg -n "AI Thực Chiến|Đồng Nai|workshop STEM|QĐ 3439|CV 3089" portfolio/public/project-docs
```

Expected: no matches; docs discuss VéĐi only.

- [ ] **Step 4: Checkpoint**

Run: `rtk git status --short portfolio/public/project-docs`

Expected: one new directory with exactly eight files; commit it on `feat/vedi-project-docs` after checks pass.

---

### Task 5: Route registration, discovery links, and isolated typography

**Files:**
- Create: `portfolio/src/App.test.tsx`
- Modify: `portfolio/src/App.tsx`
- Modify: `portfolio/src/components/Navbar.tsx`
- Modify: `portfolio/src/index.css`

**Interfaces:**
- Consumes: default export `DocsPage`.
- Produces: navigable `/docs`, portfolio discovery links, readable Markdown.

- [ ] **Step 1: Write failing route and discovery tests**

Create `portfolio/src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import Navbar from "./components/Navbar";

describe("project docs integration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, "", "/");
  });

  it("serves the docs page at /docs", async () => {
    window.history.pushState({}, "", "/docs");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("# Tổng quan VéĐi") }));
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Tổng quan VéĐi" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/project-docs/tong-quan-vedi.md");
  });

  it("keeps report discovery and adds project docs discovery", () => {
    render(<MemoryRouter><Navbar /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "VéĐi Docs" })).toHaveAttribute("href", "/docs");
    expect(screen.getByRole("link", { name: "Báo cáo" })).toHaveAttribute("href", "/baocao");
  });
});
```

- [ ] **Step 2: Run tests and verify expected RED**

Run: `cd portfolio && npm test -- src/App.test.tsx`

Expected: route test renders Not Found and Navbar discovery test cannot find `VéĐi Docs` / `Báo cáo`.

- [ ] **Step 3: Register route**

Add import and route above catch-all in `App.tsx`:

```tsx
import DocsPage from "./pages/Docs.tsx";
```

```tsx
<Route path="/docs" element={<DocsPage />} />
```

- [ ] **Step 4: Add desktop and mobile discovery links without replacing report link**

Update lucide import:

```tsx
import { BookOpen, FileText, Menu, X } from "lucide-react";
```

Add desktop link immediately before existing `/baocao` link:

```tsx
<Link
  to="/docs"
  className="flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
>
  <BookOpen size={14} />
  VéĐi Docs
</Link>
```

Change existing desktop `/baocao` label from `Docs` to `Báo cáo`.

Add mobile link immediately before existing `/baocao` link:

```tsx
<Link
  to="/docs"
  className="flex items-center gap-2 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
  onClick={() => setOpen(false)}
>
  <BookOpen size={14} />
  VéĐi Docs
</Link>
```

Change existing mobile `/baocao` label from `Docs` to `Báo cáo`.

- [ ] **Step 5: Add namespaced Markdown CSS**

Append following rules to `portfolio/src/index.css`:

```css
.project-docs-markdown {
  color: #1e293b;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 1rem;
  line-height: 1.75;
  overflow-wrap: anywhere;
}

.project-docs-markdown h1,
.project-docs-markdown h2,
.project-docs-markdown h3 {
  color: #0f172a;
  font-weight: 750;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.project-docs-markdown h1 { margin: 0 0 1rem; font-size: clamp(2rem, 5vw, 3rem); }
.project-docs-markdown h2 { margin: 2.5rem 0 0.75rem; border-top: 1px solid #dbe4e0; padding-top: 1.5rem; font-size: 1.5rem; }
.project-docs-markdown h3 { margin: 1.75rem 0 0.5rem; font-size: 1.15rem; }
.project-docs-markdown p { margin: 0.75rem 0; }
.project-docs-markdown ul,
.project-docs-markdown ol { margin: 0.75rem 0; padding-left: 1.5rem; }
.project-docs-markdown li { margin: 0.35rem 0; }
.project-docs-markdown strong { color: #064e3b; font-weight: 700; }
.project-docs-markdown a { color: #047857; text-decoration: underline; text-underline-offset: 3px; }
.project-docs-markdown blockquote { margin: 1.25rem 0; border-left: 4px solid #059669; background: #ecfdf5; padding: 0.85rem 1rem; color: #334155; }
.project-docs-markdown code { border-radius: 0.25rem; background: #e2e8f0; padding: 0.15rem 0.35rem; color: #9f1239; font-size: 0.9em; }
.project-docs-markdown pre { margin: 1rem 0; overflow-x: auto; border: 1px solid #cbd5e1; border-radius: 0.75rem; background: #f8fafc; padding: 1rem; }
.project-docs-markdown pre code { background: transparent; padding: 0; color: #0f172a; }
.project-docs-markdown table { display: block; width: 100%; margin: 1rem 0; overflow-x: auto; border-collapse: collapse; }
.project-docs-markdown th,
.project-docs-markdown td { min-width: 10rem; border: 1px solid #cbd5e1; padding: 0.7rem 0.85rem; text-align: left; vertical-align: top; }
.project-docs-markdown th { background: #ecfdf5; color: #064e3b; font-weight: 700; }
.project-docs-markdown img { width: 100%; margin: 1rem 0; cursor: zoom-in; border: 1px solid #cbd5e1; border-radius: 0.75rem; }

@media (max-width: 767px) {
  .project-docs-markdown h1 { font-size: 2rem; }
  .project-docs-markdown h2 { font-size: 1.3rem; }
}
```

- [ ] **Step 6: Run focused integration test, then full portfolio test and lint gates**

Run:

```bash
cd portfolio
npm test -- src/App.test.tsx
npm test
npm run lint
```

Expected: all tests PASS; ESLint exits 0.

- [ ] **Step 7: Build production bundle**

Run: `cd portfolio && npm run build`

Expected: Vite build exits 0 and emits `dist/project-docs/*.md` plus bundled route assets.

- [ ] **Step 8: Checkpoint**

Run: `rtk git status --short portfolio`

Expected: only Task 5 files changed; commit them on `feat/vedi-project-docs` after gates pass.

---

### Task 6: Browser verification and final content audit

**Files:**
- Verify only; fix intended files from Tasks 1–5 if checks expose defects.

**Interfaces:**
- Consumes: built route and eight documents.
- Produces: completion evidence.

- [ ] **Step 1: Start local server**

Run: `cd portfolio && npm run dev -- --host 127.0.0.1`

Expected: Vite serves project, normally at `http://127.0.0.1:8080`.

- [ ] **Step 2: Verify desktop story**

Open `/docs` at 1440×900. Confirm:

- “Tổng quan VéĐi” loads by default;
- three sidebar groups and eight documents appear;
- selected item has visible active state;
- each item changes content and URL query;
- `/docs?doc=kien-truc-de-hieu` survives reload;
- tables/code never overflow page shell;
- desktop navigation remains one line.

- [ ] **Step 3: Verify mobile story**

Open `/docs` at 390×844. Confirm:

- sidebar is hidden and menu button visible;
- drawer opens, selection closes it, content updates;
- tap targets and focus states remain readable;
- no horizontal overflow except table/code containers.

- [ ] **Step 4: Regression-check report route**

Open `/baocao`, select at least two existing documents, then return home. Confirm old route, query selection and Markdown layout behave unchanged.

- [ ] **Step 5: Audit claims and content boundaries**

Run:

```bash
rtk rg -n "đã tích hợp production|đã giữ ghế|đã thanh toán|PSTN đang hoạt động|Zalo Call" portfolio/public/project-docs
rtk rg -n "TBD|TODO|Lorem|placeholder" portfolio/public/project-docs portfolio/src/pages/Docs.tsx portfolio/src/components/docs
```

Expected: no matches.

- [ ] **Step 6: Re-run clean verification**

Run:

```bash
cd portfolio
npm test
npm run lint
npm run build
```

Expected: all commands exit 0. Record test count and build output in handoff.

- [ ] **Step 7: Final status check**

Run: `rtk git status --short`

Expected: parent-repo files remain untouched; nested portfolio branch contains only files listed in this plan.

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

export function MarkdownRenderer({ markdown }: { markdown: string }) {
  return (
    <div className="max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-serif text-4xl leading-[1.05] tracking-[-0.03em] text-[#f7efe8] md:text-5xl">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-14 border-t border-white/8 pt-10 text-2xl font-semibold tracking-[-0.02em] text-white md:text-[2rem]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-10 text-xl font-semibold tracking-[-0.02em] text-[#f3e7de] md:text-2xl">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mt-5 text-[1.06rem] leading-9 text-[#d9cdc3] first:mt-0 md:text-[1.12rem]">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="mt-6 space-y-4 pl-6 text-[1.04rem] leading-8 text-[#d9cdc3] marker:text-[#ff9b53]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mt-6 space-y-4 pl-6 text-[1.04rem] leading-8 text-[#d9cdc3] marker:text-[#ff9b53]">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-2">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-[#fff7f2]">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="mt-8 rounded-r-[24px] border-l-2 border-[#ff9b53]/70 bg-white/[0.03] px-6 py-4 text-[#eadfd5]">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-12 border-white/10" />,
          pre: ({ children }) => (
            <pre className="mt-8 overflow-x-auto rounded-[24px] border border-white/10 bg-[#120f0d] p-5 text-[0.95rem] leading-7 text-[#f4e7db] shadow-inner">
              {children}
            </pre>
          ),
          code: ({ className, children }) =>
            className ? (
              <code className="font-mono text-[0.95em] text-[#f4e7db]">{children}</code>
            ) : (
              <code className="rounded-md bg-white/[0.05] px-2 py-1 font-mono text-[0.92em] text-[#ffd0ad]">
                {children}
              </code>
            ),
          a: ({ href, children }) => (
            <a
              className="font-medium text-[#ffb57c] underline decoration-[#ff9b53]/35 underline-offset-4 transition hover:text-[#ffd4b2]"
              href={href}
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

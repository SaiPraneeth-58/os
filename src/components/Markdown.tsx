import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words
      prose-headings:font-semibold prose-headings:tracking-tight
      prose-p:leading-relaxed
      prose-pre:bg-muted prose-pre:border prose-pre:border-border/60
      prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
      prose-li:my-0.5">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

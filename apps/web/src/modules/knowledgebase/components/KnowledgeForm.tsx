import { FormEvent, useState } from "react";

export type KnowledgeFormValue = {
  title: string;
  content: string;
  source?: string;
  tags: string[];
  file?: File | null;
};

type KnowledgeFormProps = {
  submitting: boolean;
  onSubmit: (value: KnowledgeFormValue) => Promise<void>;
};

export function KnowledgeForm({ submitting, onSubmit }: KnowledgeFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (!trimmedContent && !file) {
      setFormError("Add knowledge content or upload a text knowledge file.");
      return;
    }

    setFormError(null);

    await onSubmit({
      title: title.trim(),
      content: trimmedContent,
      source: source.trim() || undefined,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      file,
    });

    setTitle("");
    setContent("");
    setSource("");
    setTags("");
    setFile(null);
    setFileInputKey((currentKey) => currentKey + 1);
  }

  return (
    <form onSubmit={handleSubmit}>
      {formError ? <div className="error compact">{formError}</div> : null}

      <div className="field">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          placeholder="Refund policy"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="content">Knowledge content</label>
        <textarea
          id="content"
          placeholder="Add facts, support SOPs, product documentation, or FAQs. You can also upload a text file below."
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="knowledgeFile">Knowledge file</label>
        <input
          key={fileInputKey}
          id="knowledgeFile"
          type="file"
          accept=".txt,.md,.markdown,.json,.csv,.tsv,.yaml,.yml,.html,.xml,text/*,application/json"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <small className="muted">
          Text-like files are extracted for embeddings and all uploads are stored in MinIO under a managed folder.
        </small>
      </div>

      <div className="field">
        <label htmlFor="source">Source</label>
        <input
          id="source"
          placeholder="Help center URL or internal note"
          value={source}
          onChange={(event) => setSource(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="tags">Tags</label>
        <input
          id="tags"
          placeholder="billing, subscriptions, onboarding"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
        />
      </div>

      <button className="button" disabled={submitting} type="submit">
        {submitting ? "Saving..." : "Add to knowledgebase"}
      </button>
    </form>
  );
}

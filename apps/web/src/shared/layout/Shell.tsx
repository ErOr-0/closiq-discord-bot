import type { ReactNode } from "react";

import type { AppTab } from "../../App";

type ShellProps = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  children: ReactNode;
};

const tabs: Array<{ id: AppTab; label: string; description: string }> = [
  {
    id: "messages",
    label: "Messages",
    description: "Discord customer conversations",
  },
  {
    id: "knowledgebase",
    label: "Knowledgebase",
    description: "AI context documents",
  },
  {
    id: "commands",
    label: "Agent Commands",
    description: "Manage active AI tools live",
  },
];

export function Shell({ activeTab, onTabChange, children }: ShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">C</span>
          <div>
            <strong>Closiq</strong>
            <small>Discord Agent</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary navigation">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={tab.id === activeTab ? "nav-item active" : "nav-item"}
              type="button"
              onClick={() => onTabChange(tab.id)}
            >
              <span>{tab.label}</span>
              <small>{tab.description}</small>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}

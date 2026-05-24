import { useState } from "react";

import { KnowledgeBasePage } from "./modules/knowledgebase/pages/KnowledgeBasePage";
import { MessagesPage } from "./modules/messages/pages/MessagesPage";
import { CommandsPage } from "./modules/commands/pages/CommandsPage";
import { Shell } from "./shared/layout/Shell";

export type AppTab = "messages" | "knowledgebase" | "commands";

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("messages");

  return (
    <Shell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "messages" ? (
        <MessagesPage />
      ) : activeTab === "knowledgebase" ? (
        <KnowledgeBasePage />
      ) : (
        <CommandsPage />
      )}
    </Shell>
  );
}

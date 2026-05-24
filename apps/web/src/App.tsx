import { useState } from "react";

import { KnowledgeBasePage } from "./modules/knowledgebase/pages/KnowledgeBasePage";
import { MessagesPage } from "./modules/messages/pages/MessagesPage";
import { Shell } from "./shared/layout/Shell";

export type AppTab = "messages" | "knowledgebase";

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("messages");

  return (
    <Shell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "messages" ? <MessagesPage /> : <KnowledgeBasePage />}
    </Shell>
  );
}

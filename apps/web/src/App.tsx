import { useState } from "react";

import { CustomersPage } from "./modules/customers/pages/CustomersPage";
import { KnowledgeBasePage } from "./modules/knowledgebase/pages/KnowledgeBasePage";
import { MessagesPage } from "./modules/messages/pages/MessagesPage";
import { CommandsPage } from "./modules/commands/pages/CommandsPage";
import { Shell } from "./shared/layout/Shell";

export type AppTab = "customers" | "messages" | "knowledgebase" | "commands";

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("customers");

  return (
    <Shell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "customers" ? (
        <CustomersPage />
      ) : activeTab === "messages" ? (
        <MessagesPage />
      ) : activeTab === "knowledgebase" ? (
        <KnowledgeBasePage />
      ) : (
        <CommandsPage />
      )}
    </Shell>
  );
}

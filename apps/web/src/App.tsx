import { useState } from "react";

import { KnowledgeBasePage } from "./modules/knowledgebase/pages/KnowledgeBasePage";
import { MessagesPage } from "./modules/messages/pages/MessagesPage";
import { CommandsPage } from "./modules/commands/pages/CommandsPage";
import { CustomersPage } from "./modules/customers/pages/CustomersPage";
import { DashboardPage } from "./modules/dashboard/pages/DashboardPage";
import { Shell } from "./shared/layout/Shell";

export type AppTab = "dashboard" | "messages" | "knowledgebase" | "commands" | "customers";

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("dashboard");

  return (
    <Shell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "dashboard" ? (
        <DashboardPage onNavigateToTab={(tab) => setActiveTab(tab)} />
      ) : activeTab === "messages" ? (
        <MessagesPage />
      ) : activeTab === "knowledgebase" ? (
        <KnowledgeBasePage />
      ) : activeTab === "commands" ? (
        <CommandsPage />
      ) : (
        <CustomersPage />
      )}
    </Shell>
  );
}

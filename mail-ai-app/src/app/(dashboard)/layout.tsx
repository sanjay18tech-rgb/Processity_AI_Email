import { AppLayout } from '@/components/layout/AppLayout';
import { AssistantPanel } from '@/components/assistant/assistant-panel';
import { ComposeView } from '@/components/mail/compose-view';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <AppLayout>
                {children}
            </AppLayout>
            <AssistantPanel />
            <ComposeView />
        </>
    );
}

'use client';

import { ComposeView } from '@/components/mail/compose-view';

export default function ComposePage() {
    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">Compose</h1>
            <ComposeView />
        </div>
    );
}

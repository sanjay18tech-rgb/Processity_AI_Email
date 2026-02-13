import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Mail, ArrowRight, AlertTriangle, ExternalLink, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const missingEnvVars = [];
  if (!process.env.GOOGLE_CLIENT_ID) missingEnvVars.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missingEnvVars.push('GOOGLE_CLIENT_SECRET');
  if (!process.env.OPENROUTER_API_KEY) missingEnvVars.push('OPENROUTER_API_KEY');

  const isConfigured = missingEnvVars.length === 0;

  if (!isConfigured) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-background to-background p-4">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        <Card className="w-full max-w-md shadow-2xl border-yellow-500/20 bg-yellow-950/10 backdrop-blur-xl relative z-10">
          <CardHeader>
            <div className="flex items-center gap-2 text-yellow-500 mb-2">
              <div className="p-2 rounded-full bg-yellow-500/10 ring-1 ring-yellow-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <span className="font-semibold tracking-tight">Setup Required</span>
            </div>
            <CardTitle className="text-2xl">Missing Configuration</CardTitle>
            <CardDescription className="text-base">
              To run Mail AI, you need to set up the following environment variables in <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">.env.local</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Missing Keys</h3>
              <ul className="space-y-2">
                {missingEnvVars.map((v) => (
                  <li key={v} className="flex items-center gap-3 text-sm text-destructive bg-destructive/5 p-2 rounded-lg border border-destructive/10">
                    <span className="h-2 w-2 rounded-full bg-destructive shadow-[0_0_8px_rgba(var(--destructive),0.6)]" />
                    <span className="font-mono">{v}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">How to get them</h3>

              <div className="text-sm space-y-3">
                <div className="p-4 bg-muted/50 rounded-xl border border-border/50 space-y-2 hover:bg-muted/80 transition-colors">
                  <div className="font-medium flex items-center gap-2 text-foreground">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-blue-500 text-xs text-center">1</span>
                    Google Cloud Credentials
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="ml-auto text-blue-500 hover:text-blue-400 transition-colors"><ExternalLink className="h-4 w-4" /></a>
                  </div>
                  <p className="text-xs text-muted-foreground pl-7">Create OAuth 2.0 Client ID. Add <code className="bg-background/50 px-1 py-0.5 rounded border border-border/50">http://localhost:3000/api/auth/callback</code> as Redirect URI.</p>
                </div>

                <div className="p-4 bg-muted/50 rounded-xl border border-border/50 space-y-2 hover:bg-muted/80 transition-colors">
                  <div className="font-medium flex items-center gap-2 text-foreground">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-purple-500 text-xs text-center">2</span>
                    OpenRouter Key
                    <a href="https://openrouter.ai/keys" target="_blank" className="ml-auto text-purple-500 hover:text-purple-400 transition-colors"><ExternalLink className="h-4 w-4" /></a>
                  </div>
                  <p className="text-xs text-muted-foreground pl-7">Sign up and generate a key for AI models.</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/20 border-t border-border/10 p-6">
            <p className="text-sm text-muted-foreground w-full text-center flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              After adding keys, restart the server.
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background selection:bg-primary/20">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-indigo-500/20 blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-[128px] animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[400px] p-6">
        <div className="flex flex-col space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl shadow-indigo-500/30 ring-4 ring-background/50 backdrop-blur-xl">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
              Mail AI
            </h1>
            <p className="text-muted-foreground text-lg">
              Check text
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          <Button asChild className="w-full h-12 text-base font-medium transition-all hover:scale-[1.02]" size="lg" variant="premium">
            <Link href="/api/auth/google">
              Sign in with Google
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-4 text-muted-foreground font-medium tracking-wider">
                Or continue with
              </span>
            </div>
          </div>

          <Button variant="outline" asChild className="w-full h-12 border-border/50 hover:bg-accent/50 hover:border-accent">
            <Link href="/inbox">
              Go to Inbox <span className="text-xs text-muted-foreground ml-2 font-normal">(if logged in)</span>
            </Link>
          </Button>
        </div>

        <p className="px-8 text-center text-sm text-muted-foreground/60">
          By clicking continue, you agree to our{" "}
          <Link href="#" className="underline underline-offset-4 hover:text-primary transition-colors">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="#" className="underline underline-offset-4 hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

import QARunnerClient from "./qa-runner-client";

export const metadata = {
  title: "Converter QA Runner",
  robots: {
    index: false,
    follow: false,
  },
};

export default function QARunnerPage() {
  return (
    <main className="min-h-screen bg-background">
      <QARunnerClient />
    </main>
  );
}

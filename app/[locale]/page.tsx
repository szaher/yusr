import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Contact } from "@/components/landing/contact";
import { Footer } from "@/components/landing/footer";
import { getEnrollmentState } from "@/server/services/enrollment";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const enrollmentState = await getEnrollmentState();
  const enrollmentOpen =
    enrollmentState === "open" || enrollmentState === "waitlist_only";

  return (
    <div className="flex min-h-screen flex-col">
      <Hero enrollmentOpen={enrollmentOpen} />
      <Features />
      <HowItWorks />
      <Contact />
      <Footer />
    </div>
  );
}

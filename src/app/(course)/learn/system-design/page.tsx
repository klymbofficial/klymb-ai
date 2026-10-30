import type { Metadata } from "next";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { PreRegister } from "@/components/system-design-register/PreRegister";

export const metadata: Metadata = {
  title: "Pre-register · System Design in 15 Days",
  description: "Reserve your place in System Design in 15 Days at the early Diwali price.",
};

// Until the course opens, its link takes pre-registrations. The course app
// (CourseApp) is unchanged and comes back here when enrolment opens.
export default function SystemDesignCoursePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Header />
      <main id="main" className="flex-1">
        <PreRegister />
      </main>
      <Footer />
      <CookieBanner />
    </div>
  );
}

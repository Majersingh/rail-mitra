import type { Metadata } from "next";
import HeroSearch from "@/components/HeroSearch";

export const metadata: Metadata = {
  title: "TrainSeat Finder — Find Vacant Seats for Partial Train Journeys",
  description:
    "Discover vacant sleeper and AC berths for your partial train journey in India. Real-time seat availability for any intermediate station pair.",
  keywords: [
    "Indian railway vacant seats",
    "partial journey train seats",
    "sleeper class availability",
    "AC coach vacant berths",
    "IRCTC seat finder",
  ],
  openGraph: {
    title: "TrainSeat Finder",
    description: "Find vacant seats for partial Indian railway journeys",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-neutral-100">
      {/* SEO Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md 
                          border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚂</span>
            <span className="font-bold text-primary-700 text-lg">TrainSeat</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-neutral-600">
            <a href="#how-it-works" className="hover:text-primary-600 transition-colors">
              How it works
            </a>
            <a href="#features" className="hover:text-primary-600 transition-colors">
              Features
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-4 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 
                          text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-primary-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full 
                               bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
            </span>
            Real-time seat availability
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 
                         leading-tight mb-4">
            Find{" "}
            <span className="gradient-text">Vacant Seats</span>
            <br />
            for Your Partial Journey
          </h1>

          <p className="text-lg text-neutral-500 max-w-xl mx-auto">
            Travel from any intermediate station to another on any long-route train.
            Get real-time sleeper &amp; AC coach availability — no waitlists, no hassle.
          </p>
        </div>

        {/* Search Card */}
        <HeroSearch />
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 px-4 bg-white/60">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-neutral-800 mb-10">
            How it works
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Enter Stations", desc: "Type your boarding and alighting stations with smart autocomplete." },
              { step: "2", title: "Pick a Date", desc: "Choose your travel date to see which trains actually run that day." },
              { step: "3", title: "Select Train", desc: "Browse all trains between your stations with timings and stop details." },
              { step: "4", title: "See Vacant Seats", desc: "View coach-wise vacant berths — Sleeper & all AC classes shown as cards." },
            ].map((item) => (
              <div
                key={item.step}
                className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl 
                           bg-white border border-neutral-100 hover:border-primary-200 
                           hover:shadow-md transition-all"
              >
                <span className="w-10 h-10 rounded-full bg-primary-500 text-white font-bold 
                                 flex items-center justify-center text-lg">
                  {item.step}
                </span>
                <h3 className="font-bold text-neutral-800">{item.title}</h3>
                <p className="text-sm text-neutral-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-neutral-800 mb-10">
            Why TrainSeat Finder?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "🎯", title: "Smart Partial Journey Logic", desc: "Finds seats whose vacancy window covers your boarding-to-alighting segment, not just the full route." },
              { icon: "🚃", title: "Coach-Level Granularity", desc: "See individual berth numbers, berth types (Lower/Middle/Upper/Side), and exact vacant windows." },
              { icon: "⚡", title: "Real-Time Data", desc: "Pulls live chart data directly from IRCTC, so you always see the current occupancy." },
              { icon: "🌙", title: "Sleeper + All AC Classes", desc: "Covers SL, 3A, 2A, 1A — filter to only see what matters to you." },
              { icon: "📅", title: "Day-of-Week Validation", desc: "Automatically checks if your chosen train runs on your travel date." },
              { icon: "🔍", title: "Station Autocomplete", desc: "Powered by live IndiaRailInfo data with station codes and zone info." },
            ].map((f) => (
              <div
                key={f.title}
                className="flex flex-col gap-3 p-6 rounded-2xl bg-white border 
                           border-neutral-100 hover:border-primary-200 hover:shadow-md transition-all"
              >
                <span className="text-3xl">{f.icon}</span>
                <h3 className="font-bold text-neutral-800">{f.title}</h3>
                <p className="text-sm text-neutral-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-neutral-400 border-t border-neutral-100">
        TrainSeat Finder — Unofficial tool. Data sourced from IndiaRailInfo &amp; IRCTC.
      </footer>
    </main>
  );
}

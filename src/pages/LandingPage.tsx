import { getTimeOfDaySentence } from "../utils/timeOfDay";

function LandingPage() {
  const greeting = getTimeOfDaySentence();

  return (
    <section className="page">
      <h1>{greeting}</h1>
      <div className="message-card">
        <p>Welcome back. Ready to hit the gym?</p>
      </div>
    </section>
  );
}

export default LandingPage;

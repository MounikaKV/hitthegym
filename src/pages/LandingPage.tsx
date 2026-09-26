function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

function LandingPage() {
  const greeting = getGreeting();

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

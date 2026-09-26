import { Link } from 'react-router-dom';
import '../styles/pitch.css';
import { BriefingCard } from '../components/BriefingCard';
import { AppLink } from '../components/AppLink';
import { InputLink } from '../components/InputLink';
import { PITCH_PATH } from '../config';
import { SAMPLES } from '../data/samples';
import { resultPath } from '../services/handoff';
import { buildBriefing } from '../utils/briefing';
import { parseJev } from '../utils/parseJev';

const WALL_OF_TEXT = `Great job logging your day! It's clear you're making real progress toward your goals. Looking at your weight data, you've gone from 190.2 lbs to 187.4 lbs over the past week, which is a healthy and sustainable rate of loss, generally considered to be around 1–2 pounds per week. Your 7-day average of 189.1 lbs also confirms this downward trend. Your breakfast of black coffee and a banana is light, and while bananas provide potassium and quick energy, you may want to consider adding some protein to help with satiety. The chicken burrito bowl without rice was a smart swap that reduces refined carbohydrates, and the extra guacamole provides healthy monounsaturated fats, though it is calorie-dense. Dinner of two slices of pepperoni pizza and a beer is where things get a little more complicated. Pizza tends to be high in saturated fat and sodium, and alcohol provides "empty" calories that can also affect sleep quality, which is worth noting since you slept 6.2 hours last night. On the activity side, your 25-minute easy jog is a great moderate-intensity workout! However, at 4,200 steps you're currently below your daily goal of 9,000…`;

const wallWords = WALL_OF_TEXT.split(/\s+/).length;

const TEAM = [
  { name: 'Hitesh', github: 'hitesh-vs' },
  { name: 'Hamilton', github: 'bronkula' },
  { name: 'Monika', github: 'immonika' },
  { name: 'Mounika', github: 'MounikaKV' },
];
const previews = SAMPLES.map((s) => ({ sample: s, briefing: buildBriefing(parseJev(s.jev)!, s.day) }));

function shownWords(b: ReturnType<typeof buildBriefing>) {
  return [b.word, b.headline, ...b.directions.slice(0, 2).map((d) => d.text), ...b.tiles.flatMap((t) => [t.label, t.value])]
    .join(' ')
    .split(/\s+/).length;
}

function Landing() {
  const hero = previews[0];

  return (
    <div className="htg landing">
      <nav className="nav">
        <Link to={PITCH_PATH} className="nav__logo">
          HitTheGym
        </Link>
        <InputLink className="btn btn--small">Try it</InputLink>
      </nav>

      <header className="hero">
        <p className="eyebrow">Your daily health check, in one glance</p>
        <h1 className="hero__title">
          Directions, <span className="strike">not</span> stories.
        </h1>
        <p className="hero__sub">Log your meals, workouts and weigh-in. Get a verdict and up to three things to do next.</p>
        <div className="hero__cta">
          <InputLink className="btn btn--solid">Log your day →</InputLink>
          <AppLink to={resultPath(hero.sample)} className="btn btn--outline">
            See a result
          </AppLink>
        </div>
        <div className="hero__lights" aria-hidden="true">
          <span data-tone="good">On track.</span>
          <span data-tone="okay">Drifting.</span>
          <span data-tone="bad">Off track.</span>
        </div>
      </header>

      <section className="section">
        <h2 className="section__title">Same day. Two answers.</h2>
        <p className="section__sub">Coffee, a burrito bowl, pizza and a beer, a 25-minute jog, 4,200 steps.</p>
        <div className="versus">
          <div className="versus__side versus__side--them">
            <div className="versus__tag">
              Chatbot <span className="count">{wallWords} words</span>
            </div>
            <p className="wall">{WALL_OF_TEXT}</p>
            <p className="versus__caption">…and it still hasn't told you what to do.</p>
          </div>
          <div className="versus__side versus__side--us">
            <div className="versus__tag">
              HitTheGym <span className="count count--us">{shownWords(hero.briefing)} words</span>
            </div>
            <BriefingCard briefing={hero.briefing} size="compact" />
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section__title">How it works</h2>
        <ol className="steps">
          <li>
            <span className="steps__num">1</span>
            <h3>Log it</h3>
            <p>Meals, workouts, weigh-in, steps. However you'd text a friend.</p>
          </li>
          <li>
            <span className="steps__num">2</span>
            <h3>Jev checks it</h3>
            <p>Eight focused questions in one call, each with calibrated confidence. No essay generated.</p>
          </li>
          <li>
            <span className="steps__num">3</span>
            <h3>Do it</h3>
            <p>A verdict, up to three moves, four tiles. If Jev isn't sure, it says so.</p>
          </li>
        </ol>
      </section>

      <section className="section">
        <h2 className="section__title">Three real-looking days</h2>
        <p className="section__sub">Tap one to see the full result.</p>
        <div className="examples">
          {previews.map(({ sample, briefing }) => (
            <AppLink key={sample.name} to={resultPath(sample)} className="example">
              <p className="example__name">{sample.name}</p>
              <p className="example__blurb">{sample.blurb}</p>
              <BriefingCard briefing={briefing} size="compact" />
            </AppLink>
          ))}
        </div>
      </section>

      <section className="closer">
        <h2 className="closer__title">Just tell me what to do.</h2>
        <InputLink className="btn btn--solid-invert">Log your day →</InputLink>
      </section>

      <section className="section team">
        <h2 className="section__title">Built by</h2>
        <ul className="team__list">
          {TEAM.map((m) => (
            <li key={m.github}>
              <a className="team__member" href={`https://github.com/${m.github}`} target="_blank" rel="noreferrer">
                <img className="team__avatar" src={`https://github.com/${m.github}.png?size=160`} alt="" width={64} height={64} loading="lazy" />
                <span className="team__name">{m.name}</span>
                <span className="team__handle">@{m.github}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <footer className="footer">HitTheGym · Powered by Jev from TypeSafe · Not medical advice.</footer>
    </div>
  );
}

export default Landing;

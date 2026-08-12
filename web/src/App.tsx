import { useMemo, useState } from 'react';

import {
  calendarPosition,
  getWeek,
  pace,
  today,
  unmetDependencies,
  weekCount,
} from '@pathway/shared';
import { curriculum } from './lib/data.ts';
import { LOCAL_IDENTITY, LocalProgressStore } from './lib/localStore.ts';
import { useProgress } from './lib/useProgress.ts';
import { useArtifacts } from './lib/useArtifacts.ts';
import { CurrentWeekBanner } from './components/CurrentWeekBanner.tsx';
import { WeekList } from './components/WeekList.tsx';
import { WeekDetail } from './components/WeekDetail.tsx';
import { YearProgress } from './components/ProgressControls.tsx';
import { RepoLink } from './components/ArtifactPanel.tsx';
import { CostView } from './components/CostView.tsx';

type View = 'weeks' | 'cost';

export function App() {
  // Evaluated once per mount. The current week only changes at midnight, and a
  // tech reloads far more often than that.
  const now = useMemo(() => today(), []);

  // The one place the storage backend is chosen. Swapping in the Azure adapter
  // is a change to this line and nothing else.
  const store = useMemo(() => new LocalProgressStore(LOCAL_IDENTITY), []);

  const { progress, loading, error, setStatus, setHours, isComplete } = useProgress(store);
  const artifacts = useArtifacts(store, curriculum);

  const currentWeek = useMemo(() => {
    const position = calendarPosition(curriculum, now);
    return position.state === 'in_progress' ? position.week.week : null;
  }, [now]);

  const [selectedWeek, setSelectedWeek] = useState(() => currentWeek ?? 1);
  const [view, setView] = useState<View>('weeks');

  /** Jumping to a week from the cost view should also bring you back to it. */
  function goToWeek(week: number) {
    setSelectedWeek(week);
    setView('weeks');
  }

  const week = getWeek(curriculum, selectedWeek);
  const weekProgress = progress.find((p) => p.week === selectedWeek);
  const yourPace = pace(curriculum, progress, now);

  const unmet = useMemo(
    () => (week ? unmetDependencies(curriculum, week.week, isComplete) : []),
    [week, isComplete],
  );

  return (
    <div className="app">
      <header className="masthead">
        <h1>{curriculum.title}</h1>
        <p>
          {weekCount(curriculum)} weeks · one lab per week · built for{' '}
          {curriculum.client.name}, {curriculum.client.staff} staff across{' '}
          {curriculum.client.sites} sites
        </p>
        {!loading && <YearProgress progress={progress} totalWeeks={weekCount(curriculum)} />}
        <RepoLink
          repo={artifacts.repo}
          onLink={artifacts.linkRepo}
          onUnlink={artifacts.unlinkRepo}
        />
        <nav className="view-tabs" aria-label="View">
          <button
            className="segment"
            aria-pressed={view === 'weeks'}
            onClick={() => setView('weeks')}
          >
            Weeks
          </button>
          <button
            className="segment"
            aria-pressed={view === 'cost'}
            onClick={() => setView('cost')}
          >
            Tools &amp; cost
          </button>
        </nav>
      </header>

      {error && <div className="alert">{error}</div>}
      {artifacts.error && <div className="alert">{artifacts.error}</div>}

      {!store.isPersistent && (
        <div className="alert">
          This browser is blocking local storage, so nothing you record will
          survive a reload. Progress will be kept for this session only.
        </div>
      )}

      <CurrentWeekBanner
        curriculum={curriculum}
        now={now}
        pace={yourPace}
        onSelectWeek={goToWeek}
      />

      {view === 'cost' ? (
        <CostView curriculum={curriculum} now={now} onSelectWeek={goToWeek} />
      ) : (
      <div className="columns">
        <WeekList
          curriculum={curriculum}
          progress={progress}
          checks={artifacts.checks}
          selectedWeek={selectedWeek}
          currentWeek={currentWeek}
          onSelectWeek={setSelectedWeek}
        />

        {week ? (
          <WeekDetail
            curriculum={curriculum}
            week={week}
            now={now}
            progress={weekProgress}
            store={store}
            unmetDependencies={unmet}
            repo={artifacts.repo}
            artifactCheck={artifacts.checks.get(week.week)}
            verifying={artifacts.verifying === week.week}
            onSelectWeek={setSelectedWeek}
            onStatusChange={setStatus}
            onHoursChange={setHours}
            onVerify={(w) => void artifacts.verify(w)}
            onAttest={(w) => void artifacts.attest(w)}
            onClearCheck={(w) => void artifacts.clearCheck(w)}
          />
        ) : (
          <p className="empty">Week {selectedWeek} is not in this curriculum.</p>
        )}
      </div>
      )}

      <footer className="footnote">
        Progress is stored in this browser only. Verification reads public repos
        directly from GitHub, so it is rate limited; private repos need the
        hosted version.
      </footer>
    </div>
  );
}

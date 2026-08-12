import { useMemo, useState } from 'react';

import { calendarPosition, getWeek, pace, today, weekCount } from '@pathway/shared';
import { curriculum } from './lib/data.ts';
import { LOCAL_IDENTITY, LocalProgressStore } from './lib/localStore.ts';
import { useProgress } from './lib/useProgress.ts';
import { CurrentWeekBanner } from './components/CurrentWeekBanner.tsx';
import { WeekList } from './components/WeekList.tsx';
import { WeekDetail } from './components/WeekDetail.tsx';
import { YearProgress } from './components/ProgressControls.tsx';

export function App() {
  // Evaluated once per mount. The current week only changes at midnight, and a
  // tech reloads far more often than that.
  const now = useMemo(() => today(), []);

  // The one place the storage backend is chosen. Swapping in the Azure adapter
  // is a change to this line and nothing else.
  const store = useMemo(() => new LocalProgressStore(LOCAL_IDENTITY), []);

  const { progress, loading, error, setStatus, setHours } = useProgress(store);

  const currentWeek = useMemo(() => {
    const position = calendarPosition(curriculum, now);
    return position.state === 'in_progress' ? position.week.week : null;
  }, [now]);

  const [selectedWeek, setSelectedWeek] = useState(() => currentWeek ?? 1);

  const week = getWeek(curriculum, selectedWeek);
  const weekProgress = progress.find((p) => p.week === selectedWeek);
  const yourPace = pace(curriculum, progress, now);

  return (
    <div className="app">
      <header className="masthead">
        <h1>{curriculum.title}</h1>
        <p>
          {weekCount(curriculum)} weeks · one lab per week · built for{' '}
          {curriculum.client.name}, {curriculum.client.staff} staff across{' '}
          {curriculum.client.sites} sites
        </p>
        {!loading && (
          <YearProgress progress={progress} totalWeeks={weekCount(curriculum)} />
        )}
      </header>

      {error && <div className="alert">{error}</div>}

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
        onSelectWeek={setSelectedWeek}
      />

      <div className="columns">
        <WeekList
          curriculum={curriculum}
          progress={progress}
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
            onSelectWeek={setSelectedWeek}
            onStatusChange={setStatus}
            onHoursChange={setHours}
          />
        ) : (
          <p className="empty">Week {selectedWeek} is not in this curriculum.</p>
        )}
      </div>

      <footer className="footnote">
        Progress is stored in this browser only. Sign-in, dependency warnings and
        artifact verification are still to come — see the roadmap in CLAUDE.md.
      </footer>
    </div>
  );
}

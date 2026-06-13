export function AppLoadingScreen() {
  const pages = Array.from({ length: 5 }, (_, index) => index);

  return (
    <div className="app-loading-screen">
      <div className="loader" aria-label="Loading SAT Practice Simulator" role="status">
        <div>
          <ul>
            {pages.map((page) => (
              <li key={page}>
                <svg viewBox="0 0 90 120" aria-hidden="true">
                  <path d="M0 0h90v120H0z" fill="currentColor" />
                </svg>
              </li>
            ))}
          </ul>
        </div>
        <span>Loading</span>
      </div>
    </div>
  );
}

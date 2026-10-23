import 'tsx';

export async function startServer() {
  const { startServer: runServer } = await import('./server/app');
  return runServer();
}

startServer().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

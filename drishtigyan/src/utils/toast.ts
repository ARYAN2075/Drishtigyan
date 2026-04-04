type ToastFn = (message: string) => void;

const log: ToastFn = (message) => {
  // Minimal fallback until a real toast system is wired up
  console.log(message);
};

export const showToast = {
  success: log,
  error: log,
  info: log
};

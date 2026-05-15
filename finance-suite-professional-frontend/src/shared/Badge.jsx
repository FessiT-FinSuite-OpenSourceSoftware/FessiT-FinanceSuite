export default function DevBadge() {
  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed top-4 right-[-35px] rotate-45 bg-red-600 text-white px-10 py-1 text-xs font-bold z-9999 shadow-lg pointer-events-none">
      DEV MODE
    </div>
  );
}
import path from 'path';

export default function userhome() {
  const home = process.env[process.platform === "win32" ? "USERPROFILE" : "HOME"];

  if (!home) {
    throw new Error("Could not find a valid user home path.");
  }

  return path.resolve(home, ...Array.prototype.slice.call(arguments, 0));
}

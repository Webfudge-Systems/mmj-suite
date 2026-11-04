/**
 * Showroom tablet endpoints. Pairing and PIN sign-in are reached before anyone
 * is signed in, so they check the tablet's own token instead.
 */
const staff = { policies: ["global::is-staff"] };
const route = (method: string, path: string, handler: string) => ({ method, path, handler, config: staff });
const open = (method: string, path: string, handler: string) => ({ method, path, handler, config: { auth: false } });

export const floorRoutes = [
  route("GET", "/floor/devices", "devices.list"),
  route("POST", "/floor/devices", "devices.create"),
  route("POST", "/floor/devices/:id/revoke", "devices.revoke"),
  route("GET", "/floor/designs", "floor.designs"),
  route("GET", "/floor/designs/:id", "floor.design"),
  route("POST", "/floor/pick", "floor.pick"),
  route("POST", "/floor/put-back", "floor.putBack"),
  route("GET", "/floor/held", "floor.held"),
];

export const openFloorRoutes = [
  open("POST", "/floor/pair", "devices.pair"),
  open("GET", "/floor/people", "devices.whoCanSignIn"),
  open("POST", "/floor/pin", "devices.pinSignIn"),
];

export default { routes: [...floorRoutes, ...openFloorRoutes] };

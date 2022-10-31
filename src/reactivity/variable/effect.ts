let activeEffect_data;
let shouldTrack_data = false;
const targetMap_data = new Map();

export function activeEffect() {
  return activeEffect_data;
}

export function setActiveEffect(value) {
  activeEffect_data = value;
  return true;
}

export function shouldTrack() {
  return shouldTrack_data;
}

export function setShouldTrack(value) {
  shouldTrack_data = value;
}

export function targetMap() {
  return targetMap_data;
}

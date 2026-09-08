type unknownFunction = (...args: unknown[]) => unknown | Promise<unknown>;
type voidFunction = (...args: unknown[]) => void;

type unSubEvent = voidFunction;

class Events {
  #EventsList: Record<string, Array<unknownFunction> | undefined> = {};

  private initEventItem(name: string): void {
    if (this.#EventsList[name] === undefined) this.#EventsList[name] = [];
  }

  public removeEvent(name: string, event: unknownFunction): void {
    const eventIndex = this.#EventsList[name]?.indexOf(event) || -1;
    if (eventIndex === -1) return console.warn(`未找到将移除事件${name}`);
    this.#EventsList[name]!.splice(eventIndex);
  }

  public subEvent(name: string, event: unknownFunction): unSubEvent {
    this.initEventItem(name);
    this.#EventsList[name]!.push(event);
    return () => this.removeEvent(name, event);
  }

  public async triggerEvent(name: string, ...args: unknown[]) {
    for (const event of this.#EventsList[name] || []) {
      const result = await event(...args);
      if (result === false) return Promise.reject();
    }
  }
}

const events = new Events();

export default events;

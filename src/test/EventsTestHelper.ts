export type RecordedEvent<TName extends string = string, TPayload = unknown> = {
  name: TName;
  payload: TPayload;
};

export const EventsTestHelper = {
  createRecorder<TName extends string = string, TPayload = unknown>() {
    const events: RecordedEvent<TName, TPayload>[] = [];

    return {
      events,
      record(name: TName, payload: TPayload) {
        events.push({ name, payload });
      },
      names() {
        return events.map((event) => event.name);
      },
      last() {
        return events.at(-1);
      },
    };
  },
};

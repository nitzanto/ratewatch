import { getConnectionLostAt } from './connection-lost-at';

describe('getConnectionLostAt', () => {
  it('sets the time when the connection goes down', () => {
    expect(getConnectionLostAt(null, 'lost', 1_000)).toBe(1_000);
  });

  it('keeps the first time while the connection stays down', () => {
    expect(getConnectionLostAt(1_000, 'lost', 5_000)).toBe(1_000);
  });

  it('clears the time once the connection is live again', () => {
    expect(getConnectionLostAt(1_000, 'live', 5_000)).toBeNull();
  });

  it('changes nothing while connecting', () => {
    expect(getConnectionLostAt(null, 'connecting', 5_000)).toBeNull();
    expect(getConnectionLostAt(1_000, 'connecting', 5_000)).toBe(1_000);
  });
});

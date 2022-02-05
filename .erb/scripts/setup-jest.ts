// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).yt = {
  getYouTubeVideoSource: jest
    .fn()
    .mockImplementation(async () => 'http://mock_url'),
};

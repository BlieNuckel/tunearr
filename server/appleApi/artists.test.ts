import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getArtistArtwork, getArtistsArtwork } from './artists';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

function jsonResponse(data: unknown) {
  return { json: () => Promise.resolve(data) };
}

describe('getArtistArtwork', () => {
  it('returns 300x300 artwork URL when artist found', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        resultCount: 1,
        results: [
          {
            artistId: 816,
            artistName: 'Radiohead',
            artistLinkUrl: 'https://music.apple.com/us/artist/radiohead/816',
            artworkUrl100:
              'https://is1-ssl.mzstatic.com/image/thumb/Features115/v4/75/9c/ff/759cff39-7fe4-a20a-3e63-d6a95db02b8c/mzl.xngtpwmz.jpg/100x100bb.jpg',
          },
        ],
      })
    );

    const result = await getArtistArtwork('Radiohead');

    expect(result).toBe(
      'https://is1-ssl.mzstatic.com/image/thumb/Features115/v4/75/9c/ff/759cff39-7fe4-a20a-3e63-d6a95db02b8c/mzl.xngtpwmz.jpg/300x300bb.jpg'
    );
    expect(mockFetch).toHaveBeenCalledWith(
      'https://itunes.apple.com/search?term=Radiohead&entity=musicArtist&limit=1'
    );
  });

  it('returns empty string when no results', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        resultCount: 0,
        results: [],
      })
    );

    const result = await getArtistArtwork('NonexistentArtist');
    expect(result).toBe('');
  });

  it('returns empty string when result has no artwork', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        resultCount: 1,
        results: [
          {
            artistId: 999,
            artistName: 'Some Artist',
            artistLinkUrl: 'https://music.apple.com/us/artist/some-artist/999',
          },
        ],
      })
    );

    const result = await getArtistArtwork('Some Artist');
    expect(result).toBe('');
  });
});

describe('getArtistsArtwork', () => {
  it('returns map of artist names to artwork URLs', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          resultCount: 1,
          results: [
            {
              artistId: 816,
              artistName: 'Radiohead',
              artworkUrl100: 'https://example.com/radiohead/100x100bb.jpg',
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          resultCount: 1,
          results: [
            {
              artistId: 1234,
              artistName: 'Portishead',
              artworkUrl100: 'https://example.com/portishead/100x100bb.jpg',
            },
          ],
        })
      );

    const result = await getArtistsArtwork(['Radiohead', 'Portishead']);

    expect(result.size).toBe(2);
    expect(result.get('radiohead')).toBe(
      'https://example.com/radiohead/300x300bb.jpg'
    );
    expect(result.get('portishead')).toBe(
      'https://example.com/portishead/300x300bb.jpg'
    );
  });

  it('handles artists with no artwork', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          resultCount: 1,
          results: [
            {
              artistId: 816,
              artistName: 'Radiohead',
              artworkUrl100: 'https://example.com/radiohead/100x100bb.jpg',
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          resultCount: 0,
          results: [],
        })
      );

    const result = await getArtistsArtwork(['Radiohead', 'Unknown Artist']);

    expect(result.size).toBe(2);
    expect(result.get('radiohead')).toBe(
      'https://example.com/radiohead/300x300bb.jpg'
    );
    expect(result.get('unknown artist')).toBe('');
  });
});

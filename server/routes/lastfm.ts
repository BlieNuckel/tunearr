import type { Request, Response } from 'express';
import express from 'express';
import {
  getSimilarArtists,
  getArtistTopTags,
  getTopArtistsByTag,
} from '../lastfmApi/artists';
import { getTopAlbumsByTag } from '../lastfmApi/albums';
import { getArtistsArtwork } from '../appleApi/artists';

const router = express.Router();

router.get('/similar', async (req: Request, res: Response) => {
  const { artist } = req.query;
  if (typeof artist !== 'string') {
    return res
      .status(400)
      .json({ error: 'artist query parameter is required' });
  }

  const artists = await getSimilarArtists(artist);

  // Enrich with Apple Music artwork
  const artworkMap = await getArtistsArtwork(artists.map((a) => a.name));
  const enrichedArtists = artists.map((a) => ({
    ...a,
    imageUrl: artworkMap.get(a.name.toLowerCase()) || a.imageUrl,
  }));

  res.json({ artists: enrichedArtists });
});

router.get('/artist/tags', async (req: Request, res: Response) => {
  const { artist } = req.query;
  if (typeof artist !== 'string') {
    return res
      .status(400)
      .json({ error: 'artist query parameter is required' });
  }

  const tags = await getArtistTopTags(artist);
  res.json({ tags });
});

router.get('/tag/artists', async (req: Request, res: Response) => {
  const { tag, page } = req.query;
  if (typeof tag !== 'string') {
    return res.status(400).json({ error: 'tag query parameter is required' });
  }

  const result = await getTopArtistsByTag(
    tag,
    typeof page === 'string' ? page : '1'
  );

  // Enrich with Apple Music artwork
  const artworkMap = await getArtistsArtwork(result.artists.map((a) => a.name));
  const enrichedArtists = result.artists.map((a) => ({
    ...a,
    imageUrl: artworkMap.get(a.name.toLowerCase()) || a.imageUrl,
  }));

  res.json({ ...result, artists: enrichedArtists });
});

router.get('/tag/albums', async (req: Request, res: Response) => {
  const { tag, page } = req.query;
  if (typeof tag !== 'string') {
    return res.status(400).json({ error: 'tag query parameter is required' });
  }

  const result = await getTopAlbumsByTag(
    tag,
    typeof page === 'string' ? page : '1'
  );
  res.json(result);
});

export default router;

import { redirect } from 'next/navigation';

/**
 * The browsable archive is retired: one legend a day, released at 8am
 * Pacific. Played games live in your library (signed in). Route kept so old
 * links land somewhere sensible.
 */
export default function Archive() {
  redirect('/');
}

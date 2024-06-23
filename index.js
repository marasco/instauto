'use strict';
const puppeteer = require('puppeteer'); // eslint-disable-line import/no-extraneous-dependencies
const Instauto = require('instauto'); // eslint-disable-line import/no-unresolved
const dotenv = require('dotenv'); // eslint-disable-line import/no-unresolved
dotenv.config();

// Optional: Custom logger with timestamps
const log = (fn, ...args) => console[fn](new Date().toISOString(), ...args);
const logger = Object.fromEntries(['log', 'info', 'debug', 'error', 'trace', 'warn'].map((fn) => [fn, (...args) => log(fn, ...args)]));
if (!process.env.INSTAGRAM_PASSWORD || !process.env.INSTAGRAM_USERNAME) {
  return console.error('Please provide INSTAGRAM_PASSWORD and INSTAGRAM_USERNAME');
}
const options = {
  cookiesPath: './cookies.json',
  username: process.env.INSTAGRAM_USERNAME,
  password: process.env.INSTAGRAM_PASSWORD,

  maxFollowsPerHour: process.env.MAX_FOLLOWS_PER_HOUR != null ? parseInt(process.env.MAX_FOLLOWS_PER_HOUR, 10) : 15,
  maxFollowsPerDay: process.env.MAX_FOLLOWS_PER_DAY != null ? parseInt(process.env.MAX_FOLLOWS_PER_DAY, 10) : 100,
  maxLikesPerDay: process.env.MAX_LIKES_PER_DAY != null ? parseInt(process.env.MAX_LIKES_PER_DAY, 10) : 20,
  followUserRatioMin: process.env.FOLLOW_USER_RATIO_MIN != null ? parseFloat(process.env.FOLLOW_USER_RATIO_MIN) : 0.2,
  followUserRatioMax: process.env.FOLLOW_USER_RATIO_MAX != null ? parseFloat(process.env.FOLLOW_USER_RATIO_MAX) : 4.0,
  followUserMaxFollowers: null,
  followUserMaxFollowing: 5000,
  followUserMinFollowers: 99,
  followUserMinFollowing: 99,
  shouldFollowUser: null, 
  shouldLikeMedia: null,
  dontUnfollowUntilTimeElapsed: 3 * 24 * 60 * 60 * 1000, //3 days
  excludeUsers: [],
  dryRun: true,
  logger,
};

(async () => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    const instautoDb = await Instauto.JSONDB({
      followedDbPath: './followed.json',
      unfollowedDbPath: './unfollowed.json',
      likedPhotosDbPath: './liked-photos.json',
    });

    const instauto = await Instauto(instautoDb, browser, options);

    const unfollowedCount = await instauto.unfollowOldFollowed({ ageInDays: 7, limit: options.maxFollowsPerDay * (2 / 3) });

    if (unfollowedCount > 0) await instauto.sleep(10 * 60 * 1000);

    // List of usernames that we should follow the followers of, can be celebrities etc.
    const usersToFollowFollowersOf = process.env.USERS_TO_FOLLOW != null ? process.env.USERS_TO_FOLLOW.split(',') : [];

    // Now go through each of these and follow a certain amount of their followers
    await instauto.followUsersFollowers({
      usersToFollowFollowersOf,
      maxFollowsTotal: options.maxFollowsPerDay - unfollowedCount,
      skipPrivate: true,
      enableLikeImages: false,
      likeImagesMax: 0,
    });

    await instauto.sleep(10 * 60 * 1000);

    console.log('Done running');

    await instauto.sleep(30000);
  } catch (err) {
    console.error(err);
  } finally {
    console.log('Closing browser');
    if (browser) await browser.close();
  }
})();

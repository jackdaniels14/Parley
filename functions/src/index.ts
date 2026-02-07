import * as admin from "firebase-admin";

admin.initializeApp();

// Auth
export {registerUsername} from "./auth/registerUsername";

// Debates
export {getDailyDebates} from "./debates/getDailyDebates";
export {createDebate} from "./debates/createDebate";

// Posts
export {createPost} from "./posts/createPost";
export {replyToPost} from "./posts/replyToPost";

// Topics
export {manageTopic} from "./topics/manageTopic";

// Moderation
export {reportPost} from "./moderation/reportPost";
export {actionReport} from "./moderation/actionReport";
export {expireOldDebates} from "./moderation/expireOldDebates";
export {contentCheck} from "./moderation/contentCheck";

// Social
export {syncSocialAccount} from "./social/syncSocialAccount";
export {getSuggestedPreferences} from "./social/getSuggestedPreferences";

// Triggers
export {onReactionWrite} from "./triggers/onReactionWrite";

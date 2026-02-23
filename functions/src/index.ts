import * as admin from "firebase-admin";

admin.initializeApp();

// Auth
export {registerUsername} from "./auth/registerUsername";

// Debates
export {createDebate} from "./debates/createDebate";
export {joinDebate} from "./debates/joinDebate";
export {startDebate} from "./debates/startDebate";
export {advanceRound} from "./debates/advanceRound";
export {finalizeDebate} from "./debates/finalizeDebate";
export {cancelDebate} from "./debates/cancelDebate";

// Arguments
export {submitArgument} from "./arguments/submitArgument";

// Moderation
export {contentCheck} from "./moderation/contentCheck";
export {reportContent} from "./moderation/reportContent";
export {actionReport} from "./moderation/actionReport";
export {moderateDebate} from "./moderation/moderateDebate";

// Matchmaking
export {enqueueForMatch} from "./matchmaking/enqueueForMatch";
export {dequeueFromMatch} from "./matchmaking/dequeueFromMatch";
export {processMatchmaking} from "./matchmaking/processMatchmaking";

// Challenges
export {issueChallenge} from "./challenges/issueChallenge";
export {respondToChallenge} from "./challenges/respondToChallenge";
export {expireChallenges} from "./challenges/expireChallenges";

// Topics
export {manageTopic} from "./topics/manageTopic";

// Scheduled
export {processDebateTimeouts} from "./scheduled/processDebateTimeouts";

// Triggers
export {onArgumentReactionWrite} from "./triggers/onArgumentReactionWrite";
export {onVoteWrite} from "./triggers/onVoteWrite";

// Clips
export {fetchOEmbed} from "./clips/fetchOEmbed";
export {generateDebateClip} from "./clips/generateDebateClip";
export {processVideoClips} from "./clips/processVideoClips";

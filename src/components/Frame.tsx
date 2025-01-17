"use client";

import { useEffect, useCallback, useState } from "react";
import sdk, {
  AddFrame,
  SignIn as SignInCore,
  type Context,
} from "@farcaster/frame-sdk";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";

import { config } from "~/components/providers/WagmiProvider";
import { PurpleButton } from "~/components/ui/PurpleButton";
import { truncateAddress } from "~/lib/truncateAddress";
import { base, optimism } from "wagmi/chains";
import { useSession } from "next-auth/react";
import { createStore } from "mipd";
import { Label } from "~/components/ui/label";
import { PROJECT_TITLE } from "~/lib/constants";

function GMActions({ context }: { context: Context.FrameContext | undefined }) {
  const [gmSent, setGmSent] = useState(false);
  const [following, setFollowing] = useState(false);

  const handleSendGM = useCallback(async () => {
    try {
      if (!context?.user.fid) throw new Error("No user FID found");
      
      // Send GM to followers
      await sdk.actions.sendFrameNotification({
        fid: context.user.fid,
        title: "GM from FrameForge!",
        body: `${context.user.displayName} says GM! 👋`,
      });
      
      setGmSent(true);
    } catch (error) {
      console.error("Error sending GM:", error);
    }
  }, [context]);

  const handleFollow = useCallback(async () => {
    try {
      if (!context?.user.fid) throw new Error("No user FID found");
      
      // Follow the frame owner (0xcaso)
      await sdk.actions.followUser({
        targetFid: 0xcaso, // Replace with actual FID
      });
      
      setFollowing(true);
    } catch (error) {
      console.error("Error following:", error);
    }
  }, [context]);

  return (
    <Card className="border-neutral-200 bg-white">
      <CardHeader>
        <CardTitle className="text-neutral-900">GM from FrameForge 👋</CardTitle>
        <CardDescription className="text-neutral-600">
          Built by 0xcaso.caso.base.eth
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-neutral-800">
        <PurpleButton 
          onClick={handleSendGM}
          disabled={gmSent}
        >
          {gmSent ? "GM Sent! 🎉" : "Send GM to Followers"}
        </PurpleButton>
        
        <PurpleButton 
          onClick={handleFollow}
          disabled={following}
        >
          {following ? "Following! ✅" : "Follow 0xcaso"}
        </PurpleButton>
        
        {context?.user && (
          <div className="text-sm text-neutral-600">
            Logged in as: {context.user.displayName}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Frame(
  { title }: { title?: string } = { title: PROJECT_TITLE }
) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext>();

  const [added, setAdded] = useState(false);

  const [addFrameResult, setAddFrameResult] = useState("");

  const addFrame = useCallback(async () => {
    try {
      await sdk.actions.addFrame();
    } catch (error) {
      if (error instanceof AddFrame.RejectedByUser) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      if (error instanceof AddFrame.InvalidDomainManifest) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      setAddFrameResult(`Error: ${error}`);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const context = await sdk.context;
      if (!context) {
        return;
      }

      setContext(context);
      setAdded(context.client.added);

      // If frame isn't already added, prompt user to add it
      if (!context.client.added) {
        addFrame();
      }

      sdk.on("frameAdded", ({ notificationDetails }) => {
        setAdded(true);
      });

      sdk.on("frameAddRejected", ({ reason }) => {
        console.log("frameAddRejected", reason);
      });

      sdk.on("frameRemoved", () => {
        console.log("frameRemoved");
        setAdded(false);
      });

      sdk.on("notificationsEnabled", ({ notificationDetails }) => {
        console.log("notificationsEnabled", notificationDetails);
      });
      sdk.on("notificationsDisabled", () => {
        console.log("notificationsDisabled");
      });

      sdk.on("primaryButtonClicked", () => {
        console.log("primaryButtonClicked");
      });

      console.log("Calling ready");
      sdk.actions.ready({});

      // Set up a MIPD Store, and request Providers.
      const store = createStore();

      // Subscribe to the MIPD Store.
      store.subscribe((providerDetails) => {
        console.log("PROVIDER DETAILS", providerDetails);
        // => [EIP6963ProviderDetail, EIP6963ProviderDetail, ...]
      });
    };
    if (sdk && !isSDKLoaded) {
      console.log("Calling load");
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded, addFrame]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <div className="w-[300px] mx-auto py-2 px-2">
        <h1 className="text-2xl font-bold text-center mb-4 text-neutral-900">{title}</h1>
        <GMActions context={context} />
      </div>
    </div>
  );
}

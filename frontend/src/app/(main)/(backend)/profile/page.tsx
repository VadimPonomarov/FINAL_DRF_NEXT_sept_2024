import React from 'react';
import {getServerSession} from "next-auth/next"
import {authConfig} from "@/configs/auth.ts";

const Page = async () => {
    const session = await getServerSession(authConfig)
    return (
        <div className={"h-[85vh] w-screen flex flex-col justify-center items-center"}>
            <h1>Hello</h1>
            {session?.user &&
                <div>
                    {session.user.email}
                </div>
            }
        </div>
    );
};

export default Page;
import React from 'react';
import { getProfilePageSession } from "./profilePage.service";

const Page = async () => {
    const session = await getProfilePageSession();

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
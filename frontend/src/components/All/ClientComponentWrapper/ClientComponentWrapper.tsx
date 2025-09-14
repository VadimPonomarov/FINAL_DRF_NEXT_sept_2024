"use client"
import React, {FC, ReactNode} from 'react';

interface IProps {
    children: ReactNode
}

const ClientComponentWrapper: FC<IProps> = ({children}) => {
    return (
        <>
            {children}
        </>
    );
};

export default ClientComponentWrapper;
import SkeletonCo from "@/components/Skeleton/Skeleton.tsx";

const Loading = async () => {
    return (
        <div className={"absolute w-full h-full flex justify-center items-center"}>
            <SkeletonCo/>
        </div>
    );
};

export default Loading;

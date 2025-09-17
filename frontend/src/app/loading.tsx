// Simple loading component (replaced Skeleton)
const SkeletonCo = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
);

const Loading = async () => {
    return (
        <div className={"absolute w-full h-full flex justify-center items-center"}>
            <SkeletonCo/>
        </div>
    );
};

export default Loading;

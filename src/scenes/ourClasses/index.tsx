import { SelectedPage, ClassType } from "@/shared/types";
import image1 from "@/assets/image1.png";
import image2 from "@/assets/image2.png";
import image3 from "@/assets/image3.png";
import image4 from "@/assets/image4.png";
import image5 from "@/assets/image5.png";
import image6 from "@/assets/image6.png";
import { motion } from "framer-motion";
import HText from "@/shared/HText";
import Class from "./Class";

const classes: Array<ClassType> = [
  {
    name: "Urban Commute Routes",
    description:
      "Discover the fastest and safest ways to get around the city on two wheels. Avoid heavy traffic and enjoy smoother rides.",
    image: image1,
  },
  {
    name: "Scenic Weekend Rides",
    image: image2,
  },
  {
    name: "Eco-Friendly Paths",
    description:
      "Plan routes that prioritize bike lanes and greenways, helping you ride sustainably while enjoying the outdoors.",
    image: image3,
  },
  {
    name: "Adventure Trails",
    description:
      "Looking for a challenge? Explore off-road cycling paths and longer rides that push your limits and reward your spirit.",
    image: image4,
  },
  {
    name: "Community Favorites",
    image: image5,
  },
  {
    name: "Custom Ride Planning",
    description:
      "Design your own personalized cycling route with Explorafit’s DIY planner. Tailor every journey to your preferences.",
    image: image6,
  },
];

type Props = {
  setSelectedPage: (value: SelectedPage) => void;
};

const OurClasses = ({ setSelectedPage }: Props) => {
  return (
    <section id="ourclasses" className="w-full bg-primary-100 py-40">
      <motion.div
        onViewportEnter={() => setSelectedPage(SelectedPage.OurClasses)}
      >
        <motion.div
          className="mx-auto w-5/6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
          variants={{
            hidden: { opacity: 0, x: -50 },
            visible: { opacity: 1, x: 0 },
          }}
        >
          <div className="md:w-3/5">
            <HText>OUR ROUTE COLLECTION</HText>
            <p className="py-5">
              Explorafit offers curated cycling routes for every type of rider—
              from daily commuters to weekend adventurers. Whether you’re
              seeking efficiency, scenery, or community-shared favorites, our
              library of routes helps you ride smarter and go further.
            </p>
          </div>
        </motion.div>
        <div className="mt-10 h-[353px] w-full overflow-x-auto overflow-y-hidden">
          <ul className="w-[2800px] whitespace-nowrap">
            {classes.map((item: ClassType, index) => (
              <Class
                key={`${item.name}-${index}`}
                name={item.name}
                description={item.description}
                image={item.image}
              />
            ))}
          </ul>
        </div>
      </motion.div>
    </section>
  );
};

export default OurClasses;

import {FC} from "react";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import { User, Phone, Mail, UserCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import styles from "./index.module.css";
import {IProps} from "./interfaces";

export const UserCard: FC<IProps> = ({item}) => {
    return (
        <div className="relative">
            <Card className={styles.card}>
                <CardHeader className={styles.cardHeader}>
                    <CardTitle className={styles.cardTitle}>
                        <UserCircle className="w-5 h-5" />
                        {item.firstName} {item.lastName}
                        <span className={styles.userId}>#{item.id}</span>
                    </CardTitle>
                    <CardDescription>
                        <div className={styles.infoItem}>
                            <User className="w-4 h-4" />
                            <span className={styles.label}>Age:</span>
                            <span className={styles.value}>{item.age}</span>
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent className={styles.cardContent}>
                    <div className={styles.infoItem}>
                        <Phone className="w-4 h-4" />
                        <span className={styles.value}>{item.phone}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <Mail className="w-4 h-4" />
                        <span className={styles.value}>{item.email}</span>
                    </div>
                </CardContent>
                <CardFooter className={`${styles.cardFooter} justify-end relative z-10`}>
                    <Link href={`/users/${item.id}`}>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                            View Profile
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
};
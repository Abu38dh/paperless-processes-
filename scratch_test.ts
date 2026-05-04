import { getStudentAbsences } from './app/actions/absences';

async function main() {
    const res = await getStudentAbsences('cc');
    console.log("Returned isHidden:", res.isHidden);
    console.log("Returned subjects length:", res.subjects?.length);
    console.log("Returned subjects:", res.subjects);
}

main().catch(console.error);
